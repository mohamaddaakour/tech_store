package com.techstore.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A manufacturer ("ASUS", "Dell", …). Maps to the {@code brands} table.
 *
 * <p>Deliberately identical in shape to {@link Category} rather than sharing a common base
 * class. They are separate concepts that happen to look alike today; brands will grow a logo
 * and a country, categories will grow a parent for nesting. Forcing them to share an
 * inheritance hierarchy now would make both harder to change later — and JPA inheritance
 * (`@MappedSuperclass` or a discriminator column) carries real query overhead for what would
 * only save two fields.
 */
@Entity
@Table(name = "brands")
@Getter
@Setter
@NoArgsConstructor
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;
}
