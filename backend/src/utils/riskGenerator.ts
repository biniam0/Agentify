// Risk Generator - Converts risk scores to descriptions and recommendations

export interface RiskScores {
  arenaRisk: number;
  controlRoomRisk: number;
  scoreCardRisk: number;
  totalDealRisk: number;
  subCategoryRisk: {
    ChampionRisks: number;
    CompetitionRisks: number;
    ContractualLegalRisks: number;
    DealVelocity: number;
  };
}

export interface Risk {
  description: string;
  recommendation: string;
}

/**
 * Generate risk descriptions and recommendations based on deal risk scores
 * Returns top 3 risks for ElevenLabs dynamic variables
 */
export const generateRisks = (riskScores: RiskScores): Risk[] => {
  const risks: Risk[] = [];
  const subRisks = riskScores.subCategoryRisk;
  
  // Competition Risks
  if (subRisks.CompetitionRisks > 10) {
    risks.push({
      description: `High competition risk detected with score of ${subRisks.CompetitionRisks}. Multiple competitors identified in the deal.`,
      recommendation: 'Schedule competitive analysis call with champion and prepare differentiation materials.',
    });
  } else if (subRisks.CompetitionRisks > 5) {
    risks.push({
      description: `Moderate competition risk (score: ${subRisks.CompetitionRisks}). Some competitive pressure exists.`,
      recommendation: 'Highlight unique value propositions and schedule product comparison session.',
    });
  }
  
  // Champion Risks
  if (subRisks.ChampionRisks > 10) {
    risks.push({
      description: `Champion engagement is low (score: ${subRisks.ChampionRisks}). Limited contact with key decision maker.`,
      recommendation: 'Increase touchpoints with champion and schedule one-on-one executive briefing.',
    });
  } else if (subRisks.ChampionRisks > 5) {
    risks.push({
      description: `Champion engagement needs attention (score: ${subRisks.ChampionRisks}).`,
      recommendation: 'Build stronger relationship through regular check-ins and value demonstrations.',
    });
  }
  
  // Contractual/Legal Risks
  if (subRisks.ContractualLegalRisks > 5) {
    risks.push({
      description: `Contract review pending with risk score ${subRisks.ContractualLegalRisks}. Legal concerns may delay closure.`,
      recommendation: 'Engage legal teams early and provide contract redlines for faster review.',
    });
  }
  
  // Deal Velocity Risks
  if (subRisks.DealVelocity > 5) {
    risks.push({
      description: `Deal velocity is slower than expected (score: ${subRisks.DealVelocity}). Timeline may be at risk.`,
      recommendation: 'Create urgency through limited-time offers and expedite decision-making process.',
    });
  }
  
  // Arena Risk
  if (riskScores.arenaRisk > 10) {
    risks.push({
      description: `Overall arena risk is elevated at ${riskScores.arenaRisk}. Multiple external factors affecting deal.`,
      recommendation: 'Conduct comprehensive deal review and adjust strategy accordingly.',
    });
  }
  
  // Control Room Risk
  if (riskScores.controlRoomRisk > 10) {
    risks.push({
      description: `Internal control risks identified (score: ${riskScores.controlRoomRisk}).`,
      recommendation: 'Align internal stakeholders and ensure proper resource allocation.',
    });
  }
  
  // Fill with defaults if less than 3 risks found
  while (risks.length < 3) {
    if (risks.length === 0) {
      risks.push({
        description: 'Deal is tracking well with minimal risks identified. All key metrics are positive.',
        recommendation: 'Continue with standard sales process and maintain regular communication cadence.',
      });
    } else {
      risks.push({
        description: 'No additional significant risks detected at this time.',
        recommendation: 'Proceed with planned next steps and monitor deal progress closely.',
      });
    }
  }
  
  // Return top 3 risks
  return risks.slice(0, 3);
};

/**
 * Format meeting time for dynamic variables
 */
export const formatMeetingTime = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  // Example output: "Monday, November 12, 10:30 PM"
};

