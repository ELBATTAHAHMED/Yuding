package com.ahmed.alertsservice.DTO;

import java.time.LocalDateTime;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentairesDTO {
	private Long id_comment;
	private String contenuComment;
	private LocalDateTime dateHeureComment;


}
