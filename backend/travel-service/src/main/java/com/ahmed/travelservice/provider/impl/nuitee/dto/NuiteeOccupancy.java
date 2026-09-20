package com.ahmed.travelservice.provider.impl.nuitee.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NuiteeOccupancy {
    private Integer adults;
    private List<Integer> children;
    private Integer rooms;
}
