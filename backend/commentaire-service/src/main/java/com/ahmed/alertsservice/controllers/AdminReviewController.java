package com.ahmed.alertsservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/apic/reviews/moderation")
@PreAuthorize("hasAnyRole('ADMIN','SUPPORT','CONTENT_MANAGER')")
@RequiredArgsConstructor
public class AdminReviewController {
    private final JdbcTemplate jdbc;
    public record Page(List<Map<String,Object>> content,int page,int size,long totalElements,int totalPages){}
    private int number(String n,int fallback,int max){try{return Math.max(0,Math.min(max,Integer.parseInt(n)));}catch(Exception ex){return fallback;}}
    @GetMapping("/page")
    public Page page(@RequestParam Map<String,String> q){
        var p=new MapSqlParameterSource();StringBuilder where=new StringBuilder(" FROM engagement.reviews WHERE status <> 'DELETED'");
        String state=q.getOrDefault("status","PENDING_MODERATION");
        if(!state.isBlank()&&!state.equals("ALL")){where.append(" AND status=:status");p.addValue("status",state);}
        if(q.containsKey("type")&&!q.get("type").isBlank()){where.append(" AND item_type=:type");p.addValue("type",q.get("type"));}
        if(q.containsKey("userId")&&!q.get("userId").isBlank()){where.append(" AND CAST(user_id AS text)=:userId");p.addValue("userId",q.get("userId"));}
        if(q.containsKey("bookingId")&&!q.get("bookingId").isBlank()){where.append(" AND CAST(booking_id AS text)=:bookingId");p.addValue("bookingId",q.get("bookingId"));}
        if(q.containsKey("id")){where.append(" AND CAST(id AS text)=:id");p.addValue("id",q.get("id"));}
        if(q.containsKey("q")&&!q.get("q").isBlank()){where.append(" AND lower(coalesce(title,'') || ' ' || content || ' ' || coalesce(booking_reference,'')) LIKE :q");p.addValue("q","%"+q.get("q").trim().toLowerCase(Locale.ROOT)+"%");}
        var sql=new NamedParameterJdbcTemplate(jdbc);long total=Objects.requireNonNull(sql.queryForObject("SELECT count(*)"+where,p,Long.class));
        int page=number(q.get("page"),0,100000),size=Math.max(1,number(q.get("size"),25,100));p.addValue("limit",size).addValue("offset",(long)page*size);
        var content=sql.query("SELECT *"+where+" ORDER BY created_at "+(q.getOrDefault("sort","date.asc").endsWith(".desc")?"DESC":"ASC")+",id ASC LIMIT :limit OFFSET :offset",p,(rs,row)->{
            Map<String,Object> r=new LinkedHashMap<>();r.put("id",rs.getObject("id"));r.put("userId",rs.getObject("user_id"));r.put("rating",rs.getInt("rating"));r.put("content",rs.getString("content"));r.put("status",rs.getString("status"));r.put("entityType",rs.getString("item_type"));r.put("provider",rs.getString("provider"));r.put("entityReference",rs.getString("item_reference"));r.put("entityName",rs.getString("title"));r.put("displayName",rs.getString("public_display_name"));r.put("verifiedBooking",rs.getBoolean("is_verified_purchase"));r.put("bookingReference",rs.getString("booking_reference"));r.put("createdAt",rs.getTimestamp("created_at").toInstant());r.put("updatedAt",rs.getTimestamp("updated_at").toInstant());return r;
        });
        return new Page(content,page,size,total,(int)((total+size-1)/size));
    }
    @GetMapping("/{id}/detail")
    public Map<String,Object> detail(@PathVariable UUID id) {
        var result=page(Map.of("id",id.toString(),"status","ALL","size","1"));
        if(result.content().isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Avis introuvable");
        return result.content().getFirst();
    }
    @GetMapping("/{id}/history")
    public List<Map<String,Object>> history(@PathVariable UUID id) {
        return jdbc.queryForList("SELECT operator_id AS \"operatorId\",decision,rejection_reason AS \"rejectionReason\",created_at AS \"createdAt\" FROM engagement.review_moderation_actions WHERE review_id=? ORDER BY created_at DESC",id);
    }
}
