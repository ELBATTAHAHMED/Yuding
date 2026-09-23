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
});
