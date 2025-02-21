package com.ahmed.reservationservice.repositories;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.ahmed.reservationservice.models.Transports;

@Repository
public interface TransportsRepository extends JpaRepository <Transports , Long>{


	//List<Transports> findByType_Transport(String type_Transport);
	 List<Transports> findByVille(String ville);
	 
	 List<Transports> findByPaysAndLieudeppAndLieuarr(String pays, String lieudepp, String lieuarr);
	 
	 List<Transports> findByPaysAndVilleAndVillearrAndPaysarr(String pays, String ville, String villearr, String paysarr);
	 
	 List<Transports> findByPaysAndVille(String pays, String ville);
	 
	 List<Transports> findByPaysAndVilleAndLieuarr(String pays, String ville, String lieuarr);

}


