package com.ahmed.alertsservice.controllers;

import com.ahmed.alertsservice.DTO.CommentairesDTO;
import com.ahmed.alertsservice.config.SecurityUtils;
import com.ahmed.alertsservice.models.Commentaires;
import com.ahmed.alertsservice.services.CommentaireServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/apic/comments")
public class CommentaireController {

    @Autowired
    private CommentaireServices commentairesService;

    @GetMapping("/all")
    public ResponseEntity<List<CommentairesDTO>> getAllCommentaires() {
        List<CommentairesDTO> allCommentaires = commentairesService.getAllCommentaires();
        return ResponseEntity.ok(allCommentaires);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Commentaires> getCommentaireById(@PathVariable Long id) {
        Commentaires commentaire = commentairesService.getCommentaireById(id);
        if (commentaire == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(commentaire, HttpStatus.OK);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteCommentaire(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        Commentaires commentaire = commentairesService.getCommentaireById(id);
        if (commentaire == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        // Server-side ownership check: comment author or admin
        if (!SecurityUtils.isAuthorOrAdmin(commentaire.getEmail())) {
            throw new AccessDeniedException("Access denied: You are not authorized to delete this comment");
        }

        commentairesService.deleteCommentaire(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/create")
    public ResponseEntity<Commentaires> creerCommentaire(
            @RequestBody Commentaires commentaire,
            @AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Derive author identity server-side from verified JWT claims (prevents spoofing / broken access control)
        String userEmail = jwt.getClaimAsString("email");
        String userName = jwt.getClaimAsString("name");
        if (userName == null || userName.isBlank()) {
            userName = userEmail;
        }

        commentaire.setEmail(userEmail);
        commentaire.setUsername(userName);
        if (commentaire.getDateHeureComment() == null) {
            commentaire.setDateHeureComment(LocalDateTime.now());
        }

        Commentaires nouveauCommentaire = commentairesService.creerCommentaire(commentaire);
        return new ResponseEntity<>(nouveauCommentaire, HttpStatus.CREATED);
    }
}
