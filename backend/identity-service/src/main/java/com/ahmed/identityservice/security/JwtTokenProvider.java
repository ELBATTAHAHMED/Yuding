package com.ahmed.identityservice.security;

import com.ahmed.identityservice.model.Role;
import com.ahmed.identityservice.model.User;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JwtTokenProvider {

    private final JwtEncoder jwtEncoder;
    private final RSAKey rsaJwk;
    private final RSAPublicKey publicKey;
    private final String issuer;
    private final long accessTokenExpirationMinutes;

    public JwtTokenProvider(
            JwtEncoder jwtEncoder,
            RSAKey rsaJwk,
            RSAPublicKey publicKey,
            @Value("${jwt.issuer:yuding-identity-service}") String issuer,
            @Value("${jwt.access-token-expiration-minutes:15}") long accessTokenExpirationMinutes) {
        this.jwtEncoder = jwtEncoder;
        this.rsaJwk = rsaJwk;
        this.publicKey = publicKey;
        this.issuer = issuer;
        this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTokenExpirationMinutes, ChronoUnit.MINUTES);

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        String fullName = (user.getFirstName() != null ? user.getFirstName() : "") +
                (user.getLastName() != null ? " " + user.getLastName() : "").trim();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .id(UUID.randomUUID().toString())
                .claim("email", user.getEmail())
                .claim("roles", roles)
                .claim("name", fullName)
                .build();

        JwsHeader header = JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256)
                .keyId(rsaJwk.getKeyID())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long getExpiresInSeconds() {
        return accessTokenExpirationMinutes * 60;
    }

    public Map<String, Object> getJwkSet() {
        return new JWKSet(rsaJwk.toPublicJWK()).toJSONObject();
    }

    public String getPublicKeyPem() {
        String base64Key = Base64.getMimeEncoder(64, new byte[]{'\n'})
                .encodeToString(publicKey.getEncoded());
        return "-----BEGIN PUBLIC KEY-----\n" + base64Key + "\n-----END PUBLIC KEY-----\n";
    }
}
