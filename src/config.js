const masterConfigs = {
    "Endowus": {
      triggerConfig: { phrases: ["Fund name", "Units"], key: "Fund name", rule: "all", caseSensitive: true, enforceOrder: true },
      stopConfig: { phrases: ["Total", "No assets", "No activity"], rule: "any", caseSensitive: false, enforceOrder: false }
    },
    "SGX": {
      triggerConfig: { phrases: ["Security", "Free"], key: "Security", rule: "all", caseSensitive: false, enforceOrder: false },
      stopConfig: { phrases: ["Total"], rule: "any", caseSensitive: false, enforceOrder: false }
    },
    "SAXO": {
      triggerConfig: { phrases: ["Instrument"], key: "Instrument", rule: "all", caseSensitive: false, enforceOrder: false },
      stopConfig: { phrases: ["Total"], rule: "any", caseSensitive: false, enforceOrder: false }
    }
  };
  
  export default masterConfigs;