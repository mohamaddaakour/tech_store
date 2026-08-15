package com.techstore.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<Brand, Long> {

    Optional<Brand> findBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);

    List<Brand> findAllByOrderByNameAsc();
}
