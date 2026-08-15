package com.techstore.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    /** Cheaper than fetching the row when we only need to know whether the name is taken. */
    boolean existsByNameIgnoreCase(String name);

    /** Alphabetical, which is what both the filter panel and the admin table want. */
    List<Category> findAllByOrderByNameAsc();
}
