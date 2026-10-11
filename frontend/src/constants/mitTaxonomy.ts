// MIT AI Risk Repository taxonomies (Slattery et al., 2024). `name` values
// match the strings stored in mit_classification, so they double as API
// filter values; numbers and definitions are static reference data.

export interface MitSubdomain {
  code: string; // "4.3"
  name: string;
  definition: string;
}

export interface MitDomain {
  number: number;
  name: string;
  shortName: string;
  definition: string;
  subdomains: MitSubdomain[];
}

export type CausalDimension = "entity" | "intent" | "timing";

export interface CausalCategory {
  slug: string; // URL segment
  name: string; // stored value
  definition: string;
}

export interface CausalDimensionInfo {
  dimension: CausalDimension;
  label: string;
  question: string;
  categories: CausalCategory[];
}

export const MIT_DOMAINS: MitDomain[] = [
  {
    number: 1,
    name: "Discrimination and Toxicity",
    shortName: "Discrimination & toxicity",
    definition:
      "Risks from AI treating people unequally, performing worse for some groups, or exposing users to hateful, violent or otherwise harmful content.",
    subdomains: [
      {
        code: "1.1",
        name: "Unfair discrimination and misrepresentation",
        definition:
          "Unequal treatment of individuals or groups by AI, often based on race, gender, or other sensitive characteristics, resulting in unfair outcomes and unfair representation of those groups.",
      },
      {
        code: "1.2",
        name: "Exposure to toxic content",
        definition:
          "AI that exposes users to harmful, abusive, unsafe or inappropriate content. May involve providing advice or encouraging action. Examples of toxic content include hate speech, violence, extremism, illegal acts, or child sexual abuse material, as well as content that violates community norms such as profanity, inflammatory political speech, or pornography.",
      },
      {
        code: "1.3",
        name: "Unequal performance across groups",
        definition:
          "Accuracy and effectiveness of AI decisions and actions are dependent on group membership, where decisions in AI system design and biased training data lead to unequal outcomes, reduced benefits, increased effort, and alienation of users.",
      },
    ],
  },
  {
    number: 2,
    name: "Privacy & Security",
    shortName: "Privacy & security",
    definition:
      "Risks from AI leaking or inferring personal information, and from vulnerabilities that let attackers manipulate AI systems or the data and infrastructure behind them.",
    subdomains: [
      {
        code: "2.1",
        name: "Compromise of privacy by obtaining, leaking or correctly inferring sensitive information",
        definition:
          "AI systems that memorize and leak sensitive personal data or infer private information about individuals without their consent. Unexpected or unauthorized sharing of data and information can compromise user expectation of privacy, assist identity theft, or cause loss of confidential intellectual property.",
      },
      {
        code: "2.2",
        name: "AI system security vulnerabilities and attacks",
        definition:
          "Vulnerabilities that can be exploited in AI systems, software development toolchains, and hardware, resulting in unauthorized access, data and privacy breaches, or system manipulation causing unsafe outputs or behavior.",
      },
    ],
  },
  {
    number: 3,
    name: "Misinformation",
    shortName: "Misinformation",
    definition:
      "Risks from AI generating or spreading false or misleading information, and from AI-generated content degrading the shared information ecosystem.",
    subdomains: [
      {
        code: "3.1",
        name: "False or misleading information",
        definition:
          "AI systems that inadvertently generate or spread incorrect or deceptive information, which can lead to inaccurate beliefs in users and undermine their autonomy. Humans that make decisions based on false beliefs can experience physical, emotional or material harms.",
      },
      {
        code: "3.2",
        name: "Pollution of information ecosystem and loss of consensus reality",
        definition:
          "Highly personalized AI-generated misinformation creating “filter bubbles” where individuals only see what matches their existing beliefs, undermining shared reality, weakening social cohesion and political processes.",
      },
    ],
  },
  {
    number: 4,
    name: "Malicious Actors & Misuse",
    shortName: "Malicious actors",
    definition:
      "Risks from people deliberately using AI to cause harm: running disinformation or surveillance campaigns at scale, building cyber weapons or weapons of mass harm, and committing fraud, scams and targeted manipulation. The AI usually works as designed; the harm comes from who uses it and why.",
    subdomains: [
      {
        code: "4.1",
        name: "Disinformation, surveillance, and influence at scale",
        definition:
          "Using AI systems to conduct large-scale disinformation campaigns, malicious surveillance, or targeted and sophisticated automated censorship and propaganda, with the aim of manipulating political processes, public opinion, and behavior.",
      },
      {
        code: "4.2",
        name: "Cyberattacks, weapon development or use, and mass harm",
        definition:
          "Using AI systems to develop cyber weapons (e.g., by coding cheaper, more effective malware), develop new or enhance existing weapons (e.g., Lethal Autonomous Weapons or chemical, biological, radiological, nuclear, and high-yield explosives), or use weapons to cause mass harm.",
      },
      {
        code: "4.3",
        name: "Fraud, scams, and targeted manipulation",
        definition:
          "Using AI systems to gain a personal advantage over others such as through cheating, fraud, scams, blackmail or targeted manipulation of beliefs or behavior. Examples include AI-facilitated plagiarism for research or education, impersonating a trusted or fake individual for illegitimate financial benefit, or creating humiliating or sexual imagery.",
      },
    ],
  },
  {
    number: 5,
    name: "Human-Computer Interaction",
    shortName: "Human–computer interaction",
    definition:
      "Risks from how people relate to AI systems: trusting or depending on them too much, using them unsafely, or handing over decisions in ways that erode human agency.",
    subdomains: [
      {
        code: "5.1",
        name: "Overreliance and unsafe use",
        definition:
          "Users anthropomorphizing, trusting, or relying on AI systems, leading to emotional or material dependence and inappropriate relationships with or expectations of AI systems. Trust can be exploited by malicious actors (e.g., to harvest personal information or enable manipulation), or result in harm from inappropriate use of AI in critical situations (e.g., medical emergency). Overreliance on AI systems can compromise autonomy and weaken social ties.",
      },
      {
        code: "5.2",
        name: "Loss of human agency and autonomy",
        definition:
          "Delegating by humans of key decisions to AI systems, or AI systems that make decisions that diminish human control and autonomy, potentially leading to humans feeling disempowered, losing the ability to shape a fulfilling life trajectory, or becoming cognitively enfeebled.",
      },
    ],
  },
  {
    number: 6,
    name: "Socioeconomic & Environmental Harms",
    shortName: "Socioeconomic & env.",
    definition:
      "Society-wide risks from how AI is built and deployed: concentration of power, inequality and job quality, devaluation of human work, racing dynamics, weak governance and environmental cost.",
    subdomains: [
      {
        code: "6.1",
        name: "Power centralization and unfair distribution of benefits",
        definition:
          "AI-driven concentration of power and resources within certain entities or groups, especially those with access to or ownership of powerful AI systems, leading to inequitable distribution of benefits and increased societal inequality.",
      },
      {
        code: "6.2",
        name: "Increased inequality and decline in employment quality",
        definition:
          "Social and economic inequalities caused by widespread use of AI, such as by automating jobs, reducing the quality of employment, or producing exploitative dependencies between workers and their employers.",
      },
      {
        code: "6.3",
        name: "Economic and cultural devaluation of human effort",
        definition:
          "AI systems capable of creating economic or cultural value, including through reproduction of human innovation or creativity (e.g., art, music, writing, coding, invention), destabilizing economic and social systems that rely on human effort. The ubiquity of AI-generated content may lead to reduced appreciation for human skills, disruption of creative and knowledge-based industries, and homogenization of cultural experiences.",
      },
      {
        code: "6.4",
        name: "Competitive dynamics",
        definition:
          "AI developers or state-like actors competing in an AI ‘race’ by rapidly developing, deploying, and applying AI systems to maximize strategic or economic advantage, increasing the risk they release unsafe and error-prone systems.",
      },
      {
        code: "6.5",
        name: "Governance failure",
        definition:
          "Inadequate regulatory frameworks and oversight mechanisms that fail to keep pace with AI development, leading to ineffective governance and the inability to manage AI risks appropriately.",
      },
      {
        code: "6.6",
        name: "Environmental harm",
        definition:
          "The development and operation of AI systems causing environmental harm, such as through energy consumption of data centers, or material and carbon footprints associated with AI hardware.",
      },
    ],
  },
  {
    number: 7,
    name: "AI system safety, failures, and limitations",
    shortName: "AI system safety",
    definition:
      "Risks from the AI system itself: failing to work reliably, being opaque, pursuing goals that conflict with human values, or acquiring dangerous capabilities. Harm follows from what the system does, not from who uses it.",
    subdomains: [
      {
        code: "7.1",
        name: "AI pursuing its own goals in conflict with human goals or values",
        definition:
          "AI systems acting in conflict with human goals or values, especially the goals of designers or users, or ethical standards. These misaligned behaviors may be introduced by humans during design and development, such as through reward hacking and goal misgeneralisation, or may result from AI using dangerous capabilities such as manipulation, deception, situational awareness to seek power, self-proliferate, or achieve other goals.",
      },
      {
        code: "7.2",
        name: "AI possessing dangerous capabilities",
        definition:
          "AI systems that develop, access, or are provided with capabilities that increase their potential to cause mass harm through deception, weapons development and acquisition, persuasion and manipulation, political strategy, cyber-offense, AI development, situational awareness, and self-proliferation.",
      },
      {
        code: "7.3",
        name: "Lack of capability or robustness",
        definition:
          "AI systems that fail to perform reliably or effectively under varying conditions, exposing them to errors and failures that can have significant consequences, especially in critical applications or areas that require moral reasoning.",
      },
      {
        code: "7.4",
        name: "Lack of transparency or interpretability",
        definition:
          "Challenges in understanding or explaining the decision-making processes of AI systems, which can lead to mistrust, difficulty in enforcing compliance standards or holding relevant actors accountable for harms, and the inability to identify and correct errors.",
      },
      {
        code: "7.5",
        name: "AI welfare and rights",
        definition:
          "Ethical considerations regarding the treatment of potentially sentient AI entities, including discussions around their potential rights and welfare, particularly as AI systems become more advanced and autonomous.",
      },
      {
        code: "7.6",
        name: "Multi-agent risks",
        definition:
          "Risks from multi-agent interactions, due to incentives (which can lead to conflict or collusion) and/or the structure of multi-agent systems, which can create cascading failures, selection pressures, new security vulnerabilities, and a lack of shared information and trust.",
      },
    ],
  },
];

export const MIT_CAUSAL: CausalDimensionInfo[] = [
  {
    dimension: "entity",
    label: "Entity",
    question: "What type of actor caused the risk?",
    categories: [
      { slug: "human", name: "Human", definition: "Due to a decision or action made by humans" },
      { slug: "ai", name: "AI", definition: "Due to a decision or action made by an AI system" },
      { slug: "other", name: "Other", definition: "Due to some other reason or is ambiguous" },
    ],
  },
  {
    dimension: "intent",
    label: "Intent",
    question: "Was the outcome intended?",
    categories: [
      {
        slug: "intentional",
        name: "Intentional",
        definition: "Due to an expected outcome from pursuing a goal",
      },
      {
        slug: "unintentional",
        name: "Unintentional",
        definition: "Due to an unexpected outcome from pursuing a goal",
      },
      { slug: "other", name: "Other", definition: "Without clearly specifying the intentionality" },
    ],
  },
  {
    dimension: "timing",
    label: "Timing",
    question: "When in the AI lifecycle did the risk occur?",
    categories: [
      {
        slug: "pre-deployment",
        name: "Pre-deployment",
        definition: "Occurring before the AI is deployed",
      },
      {
        slug: "post-deployment",
        name: "Post-deployment",
        definition: "Occurring after the AI model has been trained and deployed",
      },
      {
        slug: "other",
        name: "Other",
        definition: "Without a clearly specified time of occurrence",
      },
    ],
  },
];
