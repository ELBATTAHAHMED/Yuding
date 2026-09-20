package com.ahmed.identityservice;

import com.ahmed.identityservice.repository.RoleRepository;
import com.ahmed.identityservice.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class IdentityServiceIntegrationTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Context loads and Hibernate validates schema against live PostgreSQL")
    void contextLoads_and_schemaValidates() {
        assertThat(roleRepository).isNotNull();
        assertThat(userRepository).isNotNull();
        // Verify seeded roles exist in schema
        assertThat(roleRepository.count()).isGreaterThanOrEqualTo(3);
    }
}
