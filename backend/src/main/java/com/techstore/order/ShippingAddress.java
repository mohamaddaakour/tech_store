package com.techstore.order;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddress {

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "line1", nullable = false, length = 255)
    private String line1;

    @Column(name = "city", nullable = false, length = 120)
    private String city;

    @Column(name = "postal_code", nullable = false, length = 32)
    private String postalCode;

    @Column(name = "country", nullable = false, length = 120)
    private String country;
}
