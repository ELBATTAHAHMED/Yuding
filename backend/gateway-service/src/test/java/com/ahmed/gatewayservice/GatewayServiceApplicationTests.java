package com.ahmed.gatewayservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class GatewayServiceApplicationTests {
	@Value("${spring.cloud.gateway.routes[1].predicates[0]}")
	private String identityPathPredicate;

	@Test
	void contextLoads() {
	}

	@Test
	void accountRoutesReachIdentityService() {
		assertThat(identityPathPredicate).contains("/api/account/**");
	}

}
