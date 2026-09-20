package com.ahmed.alertsservice;

import com.ahmed.alertsservice.models.Commentaires;
import com.ahmed.alertsservice.services.CommentaireServices;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class CommentaireSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CommentaireServices commentaireServices;

    private Commentaires sampleComment(Long id, String email, String username) {
        Commentaires c = new Commentaires();
        c.setId_comment(id);
        c.setEmail(email);
        c.setUsername(username);
        c.setContenu("Wonderful experience!");
        c.setDateHeureComment(LocalDateTime.now());
        return c;
    }

    @Test
    @DisplayName("Anonymous access to /apic/comments/create is rejected with 401 Unauthorized")
    void anonymousAccess_rejectedWith401() throws Exception {
        Commentaires comment = new Commentaires();
        comment.setContenu("Great!");

        mockMvc.perform(post("/apic/comments/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(comment)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated user creating comment derives email and username from token claims")
    void authenticatedUser_derivesIdentityFromToken() throws Exception {
        Commentaires incoming = new Commentaires();
        incoming.setContenu("Amazing trip!");
        // Attacker attempts to spoof another user's email/username
        incoming.setEmail("victim@example.com");
        incoming.setUsername("Victim");

        Commentaires saved = sampleComment(1L, "alice@example.com", "Alice Smith");
        when(commentaireServices.creerCommentaire(any())).thenReturn(saved);

        mockMvc.perform(post("/apic/comments/create")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10")
                                        .claim("email", "alice@example.com")
                                        .claim("name", "Alice Smith")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incoming)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.username").value("Alice Smith"));
    }

    @Test
    @DisplayName("IDOR Prevention: User cannot delete another user's comment (403 Forbidden)")
    void idor_userCannotDeleteAnotherUsersComment() throws Exception {
        // Comment belongs to bob@example.com
        when(commentaireServices.getCommentaireById(5L))
                .thenReturn(sampleComment(5L, "bob@example.com", "Bob"));

        // Alice attempts to delete Bob's comment
        mockMvc.perform(delete("/apic/comments/delete/5")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10")
                                        .claim("email", "alice@example.com"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("User can delete their own comment (204 No Content)")
    void user_canDeleteOwnComment() throws Exception {
        when(commentaireServices.getCommentaireById(5L))
                .thenReturn(sampleComment(5L, "alice@example.com", "Alice Smith"));

        mockMvc.perform(delete("/apic/comments/delete/5")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))
                                .jwt(j -> j.subject("10")
                                        .claim("email", "alice@example.com"))))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Admin can delete another user's comment (204 No Content)")
    void admin_canDeleteAnotherUsersComment() throws Exception {
        when(commentaireServices.getCommentaireById(5L))
                .thenReturn(sampleComment(5L, "bob@example.com", "Bob"));

        mockMvc.perform(delete("/apic/comments/delete/5")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                .jwt(j -> j.subject("1")
                                        .claim("email", "admin@yuding.com"))))
                .andExpect(status().isNoContent());
    }
}
