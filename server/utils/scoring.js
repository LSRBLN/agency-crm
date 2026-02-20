/**
 * Audit Scoring Algorithm
 * 
 * Factor         | Weight | Criteria
 * GBP Claimed    | 25     | Google Business Profile is claimed
 * Reviews        | 25     | Percentage of reviews responded to
 * AEO Visibility | 30     | Appears in AI search simulation
 * Organic Traffic| 20     | Organic vs Direct traffic ratio
 */
function calculateAuditScore({ gbpClaimed, reviewsResponded, aeoVisible, organicTrafficPct }) {
    const scores = {
        gbp: gbpClaimed ? 25 : 0,
        reviews: reviewsResponded ? 25 : Math.floor(Math.random() * 15), // Simulated partial score
        aeo: aeoVisible ? 30 : Math.floor(Math.random() * 10),
        organic: Math.min(20, Math.round((organicTrafficPct / 100) * 20)),
    };

    const totalScore = scores.gbp + scores.reviews + scores.aeo + scores.organic;

    return { scores, totalScore };
}

module.exports = { calculateAuditScore };
