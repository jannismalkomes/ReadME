// Coin milestone definitions
export const MILESTONES = [
    {
        id: "1-day",
        days: 1,
        name: "Day 1",
        description: "Your journey begins",
        glbUrl: "",
        color: "#cd7f32" // Bronze
    },
    {
        id: "1-week",
        days: 7,
        name: "Week 1",
        description: "A full week of strength",
        glbUrl: "",
        color: "#c0c0c0" // Silver
    },
    {
        id: "2-weeks",
        days: 14,
        name: "Week 2",
        description: "Building momentum",
        glbUrl: "",
        color: "#b8860b" // Dark gold
    },
    {
        id: "3-weeks",
        days: 21,
        name: "Week 3",
        description: "Three weeks strong",
        glbUrl: "",
        color: "#ffd700" // Gold
    },
    {
        id: "1-month",
        days: 30,
        name: "Month 1",
        description: "A milestone worth celebrating",
        glbUrl: "",
        color: "#e5e4e2" // Platinum
    },
    {
        id: "1-year",
        days: 365,
        name: "Year 1",
        description: "A full year of freedom",
        glbUrl: "",
        color: "#50c878" // Emerald
    },
    {
        id: "5-years",
        days: 1825,
        name: "Year 5",
        description: "Five years of triumph",
        glbUrl: "",
        color: "#ff6b6b" // Ruby
    },
    {
        id: "10-years",
        days: 3650,
        name: "Year 10",
        description: "A decade of strength",
        glbUrl: "",
        color: "#9b59b6" // Amethyst
    }
];

export const getEarnedMilestones = (daysSober) => {
    return MILESTONES.filter(m => daysSober >= m.days);
};

export const getLatestMilestone = (daysSober) => {
    const earned = getEarnedMilestones(daysSober);
    return earned.length > 0 ? earned[earned.length - 1] : null;
};

export const getNextMilestone = (daysSober) => {
    return MILESTONES.find(m => daysSober < m.days) || null;
};

export const getMilestoneById = (id) => {
    return MILESTONES.find(m => m.id === id);
};

// Function to get milestones with uploaded GLB URLs
export const getMilestonesWithAssets = async (base44Client) => {
    try {
        const assets = await base44Client.entities.CoinAsset.list();
        return MILESTONES.map(milestone => {
            const asset = assets.find(a => a.milestone_id === milestone.id);
            return {
                ...milestone,
                glbUrl: asset?.glb_url || milestone.glbUrl
            };
        });
    } catch (error) {
        console.error('Error loading coin assets:', error);
        return MILESTONES;
    }
};