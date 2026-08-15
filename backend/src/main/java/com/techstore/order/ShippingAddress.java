package com.techstore.order;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Where an order is being delivered.
 *
 * <p>{@code @Embeddable} rather than a separate table: these five columns live directly on the
 * {@code orders} row. That is the right model because an order's address has no independent
 * identity or lifecycle — it is not shared, never queried on its own, and dies with the order. A
 * separate {@code addresses} table would add a join to every order read for no benefit.
 *
 * <p>It is also a deliberate <em>copy</em>, not a reference to a user's saved address. An order must
 * record where it was actually sent; if the customer later moves house, a dispatched order must not
 * silently rewrite its own history.
 */
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
