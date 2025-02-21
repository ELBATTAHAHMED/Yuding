package com.ahmed.alertsservice.repositories;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.ahmed.alertsservice.models.Commentaires;
@Repository
public interface CommentaireRepository extends JpaRepository <Commentaires , Long>{

}
