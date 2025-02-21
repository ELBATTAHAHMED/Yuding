package com.ahmed.alertsservice.services;

import java.util.List;
import com.ahmed.alertsservice.DTO.CommentairesDTO;
import com.ahmed.alertsservice.DTO.responseDTO;
import com.ahmed.alertsservice.models.Commentaires;

public interface CommentaireServices {

	List<CommentairesDTO> getAllCommentaires();
	
	    Commentaires getCommentaireById(Long id);

	    void deleteCommentaire(Long id);
	    
	    Commentaires updateCommentaire(Commentaires commentaire);

		responseDTO getCommentaire(Long id_comment);

		 Commentaires creerCommentaire(Commentaires commentaire);	}
