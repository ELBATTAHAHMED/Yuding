package com.ahmed.alertsservice.controllers;
import com.ahmed.alertsservice.DTO.CommentairesDTO;
import com.ahmed.alertsservice.models.Commentaires;
import com.ahmed.alertsservice.services.CommentaireServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
	    public ResponseEntity<Void> deleteCommentaire(@PathVariable Long id) {
	        commentairesService.deleteCommentaire(id);
	        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
	    }
	    
	    @PostMapping("/create")
	    public ResponseEntity<Commentaires> creerCommentaire(@RequestBody Commentaires commentaire) {
	        Commentaires nouveauCommentaire = commentairesService.creerCommentaire(commentaire);
	        return new ResponseEntity<>(nouveauCommentaire, HttpStatus.CREATED);
	    }

	

	
	}




