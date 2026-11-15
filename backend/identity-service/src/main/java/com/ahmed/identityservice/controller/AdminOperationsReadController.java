package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
@RequiredArgsConstructor
public class AdminOperationsReadController {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    public record Page<T>(List<T> content,int page,int size,long totalElements,int totalPages) {}
    private int value(Map<String,String> q,String key,int defaultValue,int max) {
        try{return Math.max(0,Math.min(max,Integer.parseInt(q.get(key))));}catch(Exception ex){return defaultValue;}
    }
    private void dates(Map<String,String> q,StringBuilder where,MapSqlParameterSource p,String column) {
        for(String key:List.of("createdFrom","createdTo")) {
            if(q.get(key)!=null&&!q.get(key).isBlank()) {
                try { p.addValue(key,java.sql.Timestamp.from(Instant.parse(q.get(key)))); }
                catch(Exception ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Date invalide");}
                where.append(" AND ").append(column).append(key.equals("createdFrom")?" >= :":" <= :").append(key);
            }
        }
    }
    @GetMapping("/page")
    @Transactional(readOnly=true)
    public Page<AdminUserSummaryResponse> userPage(@RequestParam Map<String,String> q) {
        var p=new MapSqlParameterSource();
        StringBuilder where=new StringBuilder(" FROM identity.users u WHERE 1=1");
        if(q.containsKey("q")&&!q.get("q").isBlank()){
            where.append(" AND lower(u.first_name || ' ' || u.last_name || ' ' || u.email) LIKE :q");
            p.addValue("q","%"+q.get("q").trim().toLowerCase(Locale.ROOT)+"%");
        }
        if(q.containsKey("role")&&!q.get("role").isBlank()){
            where.append(" AND EXISTS (SELECT 1 FROM identity.user_roles ur JOIN identity.roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name=:role)");
            p.addValue("role",q.get("role"));
        }
        if(q.containsKey("status")&&!q.get("status").isBlank()){
            if("LOCKED".equals(q.get("status"))) where.append(" AND u.locked_until > now()");
            else{where.append(" AND u.status=:status");p.addValue("status",q.get("status"));}
        }
        dates(q,where,p,"u.created_at");
        var sql=new NamedParameterJdbcTemplate(jdbc);
        long total=Objects.requireNonNull(sql.queryForObject("SELECT count(*)"+where,p,Long.class));
        int page=value(q,"page",0,100000),size=Math.max(1,value(q,"size",25,100));
        p.addValue("limit",size).addValue("offset",(long)page*size);
        String priority="(SELECT min(CASE r.name WHEN 'ROLE_ADMIN' THEN 0 WHEN 'ROLE_SUPPORT' THEN 1 WHEN 'ROLE_CONTENT_MANAGER' THEN 2 ELSE 3 END) FROM identity.user_roles ur JOIN identity.roles r ON r.id=ur.role_id WHERE ur.user_id=u.id)";
        String sort=Map.of("name","u.last_name","date","u.created_at","status","u.status").getOrDefault(q.getOrDefault("sort","").split("\\.")[0],"u.last_name");
        String direction=q.getOrDefault("sort","").endsWith(".desc")?" DESC":" ASC";
        var content=sql.query("SELECT u.id"+where+" ORDER BY "+priority+" ASC NULLS LAST, "+sort+direction+",u.id ASC LIMIT :limit OFFSET :offset",p,
            (rs,row)->AdminUserSummaryResponse.from(users.findById(rs.getObject(1,UUID.class)).orElseThrow()));
        return new Page<>(content,page,size,total,(int)((total+size-1)/size));
    }
    @GetMapping("/audit-page")
    public Page<AdminActionResponse> auditPage(@RequestParam Map<String,String> q){
        var p=new MapSqlParameterSource();StringBuilder where=new StringBuilder(" FROM audit.admin_actions WHERE 1=1");
        if(q.containsKey("q")&&!q.get("q").isBlank()){where.append(" AND lower(action_type || ' ' || target_entity_id || ' ' || coalesce(reason,'')) LIKE :q");p.addValue("q","%"+q.get("q").trim().toLowerCase(Locale.ROOT)+"%");}
        if(q.containsKey("event")){where.append(" AND id=:event");try{p.addValue("event",Long.parseLong(q.get("event")));}catch(NumberFormatException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Événement invalide");}}
        if(q.containsKey("target")&&!q.get("target").isBlank()){where.append(" AND target_entity_id=:target");p.addValue("target",q.get("target"));}
        if(q.containsKey("type")&&!q.get("type").isBlank()){where.append(" AND action_type=:type");p.addValue("type",q.get("type"));}
        dates(q,where,p,"created_at");
        var sql=new NamedParameterJdbcTemplate(jdbc);long total=Objects.requireNonNull(sql.queryForObject("SELECT count(*)"+where,p,Long.class));
        int page=value(q,"page",0,100000),size=Math.max(1,value(q,"size",25,100));p.addValue("limit",size).addValue("offset",(long)page*size);
        var content=sql.query("SELECT id,admin_user_id,action_type,target_service,target_entity_type,target_entity_id,reason,metadata_json,created_at"+where+" ORDER BY created_at "+(q.getOrDefault("sort","").endsWith(".asc")?"ASC":"DESC")+",id DESC LIMIT :limit OFFSET :offset",p,
            (rs,row)->new AdminActionResponse(rs.getLong(1),rs.getObject(2,UUID.class),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6),rs.getString(7),rs.getString(8),rs.getTimestamp(9).toInstant()));
        return new Page<>(content,page,size,total,(int)((total+size-1)/size));
    }
    @GetMapping("/audit-events/{id}")
    public AdminActionResponse auditEvent(@PathVariable long id) {
        return auditPage(Map.of("event",String.valueOf(id),"size","1")).content().stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Événement absent"));
    }
}
