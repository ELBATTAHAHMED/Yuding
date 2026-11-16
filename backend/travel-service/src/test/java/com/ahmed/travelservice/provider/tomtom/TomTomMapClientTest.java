package com.ahmed.travelservice.provider.tomtom;

import com.ahmed.travelservice.config.TomTomProperties;
import com.ahmed.travelservice.provider.impl.tomtom.TomTomMapClient;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.MediaType.IMAGE_PNG;

class TomTomMapClientTest {

    @Test
    void getRasterTileUsesTomTomTileEndpointAndServerSideKey() {
        TomTomProperties properties = new TomTomProperties();
        properties.setApiKey("test-tomtom-key");
        properties.setBaseUrl("https://tomtom.test");

        RestClient.Builder restClientBuilder = RestClient.builder().baseUrl(properties.getBaseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        RestClient restClient = restClientBuilder.build();
        server.expect(requestTo("https://tomtom.test/map/1/tile/basic/main/11/1088/683.png?key=test-tomtom-key&tileSize=512"))
                .andExpect(method(GET))
                .andExpect(queryParam("key", "test-tomtom-key"))
                .andRespond(withSuccess(new byte[]{(byte) 0x89, 'P', 'N', 'G'}, IMAGE_PNG));

        byte[] tile = new TomTomMapClient(properties, restClient).getRasterTile(11, 1088, 683);

        assertThat(tile).containsExactly((byte) 0x89, 'P', 'N', 'G');
        server.verify();
    }
}
