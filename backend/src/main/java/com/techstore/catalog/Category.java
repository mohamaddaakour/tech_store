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
 * A product category ("Laptops", "Monitors", …). Maps to the {@code categories} table.
 *
 * <p>Note there is no {@code List<Product> products} field here, even though the database has
 * that relationship. A {@code @OneToMany} back-reference would be tempting but costs more than
 * it gives:
 * <ul>
 *   <li>Serializing a category would try to serialize every product in it, and each product's
 *       category, producing infinite recursion (or requiring {@code @JsonIgnore} plasters).</li>
 *   <li>Deleting or counting would lazily load the entire collection into memory.</li>
 * </ul>
 * The relationship is navigated from the owning side instead — {@code Product.category} — and
 * "products in this category" is a repository query, which is what a database is for.
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    /** URL-safe form, so links read {@code /store?category=laptops} rather than {@code ?category=3}. */
    @Column(nullable = false, unique = true, length = 100)
    private String slug;
}
