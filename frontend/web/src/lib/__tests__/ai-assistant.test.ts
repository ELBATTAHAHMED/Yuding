import test, { afterEach, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { aiService } from '../../services/ai.service.ts';
import { apiClient } from '../../lib/api-client.ts';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
};

const originalFetch = globalThis.fetch;
const capturedCalls: CapturedCall[] = [];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AI Assistant V2 — Service & Routing Contract Tests', () => {
  beforeEach(() => {
    capturedCalls.length = 0;
    apiClient.setAccessToken('mock-rs256-jwt-token');
    globalThis.fetch = async (input, init) => {
      const headers = (init?.headers as Record<string, string>) || {};
      let body: any = undefined;
      if (init?.body && typeof init.body === 'string') {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      }
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        headers,
        body,
      });

      return jsonResponse({
        conversationId: body?.conversationId || 'test-conv-id',
        messageId: 'test-msg-id-123',
        role: 'assistant',
        content: 'Bienvenue sur Yuding ! Voici les suggestions pour votre voyage.',
        createdAt: '2026-09-23T20:00:00Z',
      });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    apiClient.setAccessToken(null);
  });

  test('routes AI chat request to /api/ai/chat via API Gateway (port 8888)', async () => {
    const result = await aiService.sendMessage({
      conversationId: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
      message: 'Quels sont les meilleurs endroits à visiter en Corse ?',
    });

    assert.equal(capturedCalls.length, 1);
    const call = capturedCalls[0];
    const url = new URL(call.url);

    assert.equal(url.origin, 'http://localhost:8888');
    assert.equal(url.pathname, '/api/ai/chat');
    assert.equal(call.method, 'POST');
    assert.ok(!call.url.includes(':7777'), 'Must not call ai-service port 7777 directly');

    // Headers & Auth
    assert.equal(call.headers['Authorization'], 'Bearer mock-rs256-jwt-token');
    assert.equal(call.headers['Content-Type'], 'application/json');

    // Request payload
    assert.equal(call.body.conversationId, 'c56a4180-65aa-42ec-a945-5fd21dec0538');
    assert.equal(call.body.message, 'Quels sont les meilleurs endroits à visiter en Corse ?');

    // Response structure
    assert.equal(result.conversationId, 'c56a4180-65aa-42ec-a945-5fd21dec0538');
    assert.equal(result.messageId, 'test-msg-id-123');
    assert.equal(result.role, 'assistant');
    assert.ok(result.content.includes('Bienvenue'));
    assert.ok(result.createdAt);
  });

  test('deletes only through the authenticated Gateway conversation route', async () => {
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({ url: input.toString(), method: init?.method || 'GET', headers: init?.headers as Record<string, string> });
      return new Response(null, { status: 204 });
    };
    await aiService.deleteConversation('owned-conversation');
    assert.equal(new URL(capturedCalls[0].url).pathname, '/api/ai/conversations/owned-conversation');
    assert.equal(capturedCalls[0].method, 'DELETE');
    assert.equal(capturedCalls[0].headers.Authorization, 'Bearer mock-rs256-jwt-token');
  });

  test('loads private image/audio as a Blob with JWT and revocable object URL support', async () => {
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({ url: input.toString(), method: init?.method || 'GET', headers: init?.headers as Record<string, string> });
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { 'Content-Type': 'image/png' } });
    };
    const blob = await aiService.getAttachmentContent('private-image');
    assert.ok(blob instanceof Blob);
    assert.equal(blob.type, 'image/png');
    assert.equal(new URL(capturedCalls[0].url).pathname, '/api/ai/attachments/private-image/content');
    assert.equal(capturedCalls[0].headers.Authorization, 'Bearer mock-rs256-jwt-token');
    assert.equal(capturedCalls[0].headers.Accept, '*/*');
  });

  test('handles 429 rate limit response gracefully', async () => {
    globalThis.fetch = async () => {
      return jsonResponse(
        {
          status: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
        },
        429
      );
    };

    await assert.rejects(
      async () => {
        await aiService.sendMessage({
          conversationId: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
          message: 'Test rate limit',
        });
      },
      (err: any) => {
        assert.equal(err.status, 429);
        return true;
      }
    );
  });

  test('handles 503 service unavailable response gracefully', async () => {
    globalThis.fetch = async () => {
      return jsonResponse(
        {
          status: 503,
          error: 'Service Unavailable',
          message: 'Le service IA est indisponible',
        },
        503
      );
    };

    await assert.rejects(
      async () => {
        await aiService.sendMessage({
          conversationId: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
          message: 'Test 503 fallback failure',
        });
      },
      (err: any) => {
        assert.equal(err.status, 503);
        return true;
      }
    );
  });

  test('receives grounded: true and toolsUsed when tools are executed by assistant', async () => {
    globalThis.fetch = async (input, init) => {
      return jsonResponse({
        conversationId: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
        messageId: 'grounded-msg-123',
        role: 'assistant',
        content: 'Vol Air France AF1234 disponible à 120.50 EUR de Paris vers Nice.',
        createdAt: '2026-09-23T20:00:00Z',
        grounded: true,
        toolsUsed: ['searchFlights'],
      });
    };

    const result = await aiService.sendMessage({
      conversationId: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
      message: 'Vols Paris - Nice demain',
    });

    assert.equal(result.grounded, true);
    assert.deepEqual(result.toolsUsed, ['searchFlights']);
    assert.ok(result.content.includes('Air France'));
  });

  test('routes createConversation to /api/ai/conversations via API Gateway', async () => {
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        headers: (init?.headers as Record<string, string>) || {},
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      return jsonResponse({
        id: 'new-conv-uuid',
        title: 'Nouveau voyage',
        createdAt: '2026-09-24T12:00:00Z',
        updatedAt: '2026-09-24T12:00:00Z',
      });
    };

    const conv = await aiService.createConversation('Nouveau voyage');

    assert.equal(capturedCalls.length, 1);
    const call = capturedCalls[0];
    const url = new URL(call.url);

    assert.equal(url.origin, 'http://localhost:8888');
    assert.equal(url.pathname, '/api/ai/conversations');
    assert.equal(call.method, 'POST');
    assert.equal(call.body.title, 'Nouveau voyage');
    assert.equal(conv.id, 'new-conv-uuid');
  });

  test('routes getConversations and getConversationMessages via API Gateway', async () => {
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        headers: (init?.headers as Record<string, string>) || {},
      });
      const urlStr = input.toString();
      if (urlStr.includes('/messages')) {
        return jsonResponse([
          {
            id: 'msg-1',
            conversationId: 'conv-123',
            role: 'user',
            content: 'Bonjour',
            createdAt: '2026-09-24T12:00:00Z',
          },
          {
            id: 'msg-2',
            conversationId: 'conv-123',
            role: 'assistant',
            content: 'Bonjour ! Comment puis-je vous aider ?',
            grounded: false,
            createdAt: '2026-09-24T12:00:01Z',
          },
        ]);
      }
      return jsonResponse([
        {
          id: 'conv-123',
          title: 'Séjour à Nice',
          status: 'ACTIVE',
          createdAt: '2026-09-24T12:00:00Z',
          updatedAt: '2026-09-24T12:00:01Z',
        },
      ]);
    };

    const convs = await aiService.getConversations(10);
    assert.equal(convs.length, 1);
    assert.equal(convs[0].id, 'conv-123');

    const msgs = await aiService.getConversationMessages('conv-123');
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].role, 'user');
    assert.equal(msgs[1].role, 'assistant');

    assert.equal(capturedCalls.length, 2);
    assert.equal(new URL(capturedCalls[0].url).pathname, '/api/ai/conversations');
    assert.equal(new URL(capturedCalls[1].url).pathname, '/api/ai/conversations/conv-123/messages');
  });
});
