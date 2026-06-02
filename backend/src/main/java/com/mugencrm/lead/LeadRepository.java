package com.mugencrm.lead;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LeadRepository extends JpaRepository<Lead, Long> {
    @Query("SELECT l FROM Lead l WHERE " +
           "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(l.phone) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(l.address) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Lead> search(@Param("q") String q);

    List<Lead> findByReachedOut(boolean reachedOut);
}
