package com.ahmed.alertsservice.models;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter
@Setter
@ToString
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "commentaires")
public class Commentaires {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_comment")
	private Long id_comment;
	@Column(name = "contenu")
	private String contenu;
	@Column(name = "dateHeureComment")
	private LocalDateTime dateHeureComment;
	@Column(name = "username")
	private String username;
	@Column(name = "email")
	private String email;

	

}
