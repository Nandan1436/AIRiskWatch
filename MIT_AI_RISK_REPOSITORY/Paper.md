IEEE ICTMOD 2025 1571199718 

1" 2" 3" 4" 5" 6" 7" 8" 9" 10" 11" 12" 13" 14" 15" 16" 17" _**Abstract**_ **— Artificial Intelligence (AI) is increasingly adopted** 18" **in critical sectors such as healthcare, finance, and public** 19" **administration, where it promises significant gains in efficiency,** 20" **automation, and decision support. At the same time, these systems** 21" **expose societies to serious risks, including bias, discrimination,** 22" **safety failures, and privacy infringements. To document and learn from such failures, the Artificial Intelligence Incident Database** 23" **(AIID) was created as a community-driven repository and** 24" **collective memory of AI harms, designed to support research, best** 25" **practices, and governance. As of 2025, the AIID contains more** 26" **than 1,100 incidents, yet its unstructured, narrative reports make** 27" **systematic analysis difficult and limit their policy value. This** 28" **paper addresses that challenge by applying a Large Language** 29" **Model (LLM) pipeline, guided by the OECD AI Incident** 30" **Reporting Framework, to transform AIID reports into structured data and enable systematic analysis of recurring patterns in AI** 31" **incidents. The analysis reveals a sharp rise in frequency and** 32" **severity since 2020, with human and economic harms dominating,** 33" **transparency and fairness most frequently violated, and ICT,** 34" **finance, and public administration accounting for most cases. In** 35" **terms of implications, the study provides insights to better inform** 36" **AI governance. It also demonstrates how to use LLMs to** 37" **transform unstructured dataset into structured data for analysis.** 38" _**Keywords— AI failures, AI Incident Database, Large Language**_ 39" _**Models, Natural Language Processing, AI safety, Ai ethics, AI**_ 40" _**governance.**_ 41" 42" I. INTRODUCTION 43" 44" Artificial Intelligence (AI) is increasingly deployed in high45" stakes domains such as healthcare, finance, transportation, and 46" public services [1], [2]. These technologies promise significant 47" benefits – improved efficiency, decision support, and 48" automation – but also pose real risks including bias, 49" discrimination, safety failures, and privacy infringements [3]. 50" 51" Over the past decade, numerous AI incidents have illustrated 52" these risks across sectors: for instance, biased clinical 53" algorithms exacerbating health disparities [4], discriminatory 54" credit scoring against minority groups [5], autonomous vehicle 55" collisions causing injuries [6], and wrongful arrests due to facial 56" recognition errors [7]. Each such failure underscores the urgent 57" need to learn from AI’s mistakes and develop trustworthy AI 60" systems that balance innovation with safety. 61" To systematically capture and learn from such failures, the 62" Artificial Intelligence Incident Database (AIID) 63" 64" 65" 

# LLM-Based Analysis of the AI Incident Database: Insights for AI Governance 

Hamid Nach, Ph.D. _Applied Fintech Research Lab for Africa UQAR, Campus of Lévis._ 1595, boulevard Alphonse-Desjardins Lévis (Québec) G6V 0A6, Canada Email: hamid_nach@uqar.ca 

(https://incidentdatabase.ai/) was established as a centralized, community-driven repository of AI harms and near-misses. Modeled after safety databases in aviation and cybersecurity, the AIID indexes real-world AI failure reports to serve as a “collective memory” that can inform better practices [8]. As of mid-2025, the AIID has catalogued over 1,100 incidents (with approximately 4,800 reports) spanning a wide range of AI applications. 

However, analyzing and extracting meaningful knowledge from these reports remains challenging: they are primarily unstructured narratives, often drawn from news coverage, with minimal metadata and no standardized schema [9]. Manual review is labor-intensive and statistical text-mining techniques are poorly suited for this type of data. In this context, Large Language Models (LLMs) present a promising solution. Their advanced natural language understanding and zero-shot classification capabilities enable the transformation of unstructured reports into structured data without task-specific training [10]. This study builds on that potential to address a central research question: _How can LLMs be leveraged, in alignment with established governance frameworks, to systematically analyze AI incidents and derive actionable insights for AI safety_ ? 

To answer this question, we design an LLM-based pipeline that applies the OECD AI Incident Reporting Framework [11], to nearly 1,000 reports in the AIID. The analysis reveals a sharp escalation in both the number and severity of incidents in recent years, with more than 90% classified as incidents or serious incidents. Human and economic harms dominate, particularly violations of civil liberties, fairness, and dignity, while physical and environmental harms remain relatively rare. Incidents cluster in ICT, finance, and public administration, and transparency and fairness emerge as the most frequently violated principles. 

The contributions of this paper are twofold. First, it provides data-driven insights derived from applying the OECD framework to a large corpus of AI incidents, offering actionable evidence to inform AI governance. Second, it demonstrates a scalable methodology using large language models (LLMs) for the zero-shot analysis and classification of unstructured text, 

XXX-X-XXXX-XXXX-X/XX/$XX.00 ©20XX IEEE 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

1 

establishing a practical technique for transforming narrative data into structured, analyzable information. 

The remainder of this paper is organized as follows: Section II reviews related work on AI incident repositories and automated analysis; Section III details our methodology; Section IV presents the results; Section V discusses governance implications; and Section VI concludes with directions for future research. 

## II. RELATED WORK 

Artificial intelligence incidents have become a focal point for research and policy as societies grapple with the risks of deploying AI in critical domains. Prior work can be grouped into three streams: repositories that collect and document incidents, taxonomies that classify them, and analytical tools that can transform narrative reports into structured knowledge. 

## _A. AI Incident Repositories_ 

Learning from the safety cultures of aviation and medicine [20], AI researchers and practitioners have developed repositories to document failures as a basis for collective learning. The Artificial Intelligence Incident Database (AIID) is the most prominent of these efforts [7]. It was established as a community-driven archive to capture AI harms and near misses. Complementary initiatives have emerged as well.  The OECD AI Incidents Monitor (AIM), provides real-time monitoring of incidents and hazards, building directly on media reports and open submissions [12]. These initiatives collectively illustrate the growing recognition that incident reporting is essential to AI governance. 

## _B. AI Incident Taxonomies_ 

Repositories alone are insufficient without taxonomies that allow structured analysis of harms. Several approaches have been proposed. The CSET AI Harm Taxonomy emphasizes harms relevant to the policy community, including discrimination, inequality, and violations of rights [13]. The Goals, Methods, and Failures (GMF) taxonomy focuses instead on technical and process-oriented causes, categorizing incidents according to the system’s goals, underlying methods, and specific failure modes [14]. The MIT AI Risk Repository introduces a multi-layered structure that classifies risks by domain, intent, and timing, covering 23 distinct areas ranging from privacy and security to misinformation and malicious use [13]. While each taxonomy provides valuable insights, they remain fragmented: CSET is policy-driven, GMF emphasizes technical causality, and MIT prioritizes domain-specific risks. 

## _C. OECD Common Reporting Framework_ 

To consolidate these approaches, the OECD introduced in 2025 a Common Reporting Framework for AI Incidents. Developed by the OECD.AI Expert Group on AI Incidents, the framework integrates insights from earlier taxonomies into a globally interoperable system [11]. It consists of 29 criteria organized across eight dimensions, including metadata, harm type, affected stakeholders, economic context, data and inputs, model characteristics, task and output, and complementary 

information. This framework aims to ensure that incident reporting is consistent across jurisdictions while remaining flexible enough for local adaptation. Importantly, it links technical failure modes, stakeholder harms, and governance principles, thereby providing a bridge between technical taxonomies and policy requirements. 

## _D. Analytical tools and LLMs_ 

To operationalize the taxonomies discussed and extract value from repositories like the AIID, advanced analytical tools are required to overcome a key limitation: most AI incident reports are unstructured narratives, often derived from journalistic sources, and thus difficult to analyze systematically. Early efforts relied on manual review, keywords frequencies to categorize incidents, such as Wei and Zhou’s ethics-focused content analysis [17].  Later work continued with applying textmining (NLP-based) as illustrated by Denecke and Paula [20], who used natural language processing (NLP) and BERTopic modeling to extract topics, frequent terms, and sentiment patterns from thousands of critical incident reports. 

However, traditional text-mining techniques struggle with such heterogeneous and context-dependent content, often failing to capture the nuanced complexity inherent in every news story. In contrast, advanced LLMs have given rise to a new class of tools capable of zero-shot and few-shot classification. Systems like Farsight [18], and  the MIT AI Incident Tracker [13]—for example, enable the accurate assignment of unstructured narratives to predefined taxonomies without extensive training. Their ability to provide both classification and explanation enhances interpretability and facilitates human validation. This makes LLMs particularly well-suited for scaling analysis across hundreds of reports and translating disparate narratives into structured insights for governance. While prior research has used the emerging LLM capabilities to analyze AI failures, to our knowledge, this study represents the first application of an LLM-based pipeline—leveraging the DeepSeek reasoning model—guided by the OECD Framework [11], thereby establishing a novel approach for drawing governance-relevant insights from the AIID corpus. 

## III. RESEARCH METHOD 

## _A. Analytical Framework_ 

The objective of this study is to analyze the AI Incident Database using an LLM-driven approach to extract structured insights from unstructured incident reports. The analysis is guided by the OECD's 2025 report, " _Towards a Common Reporting Framework for AI Incidents_ ," which outlines eight key dimensions for documenting AI-related failures. This framework was selected because it provides a standardized, internationally recognized approach to incident classification that enables systematic comparison and policy development. 

This study focuses on six of these dimensions: (1) People & Planet (stakeholders affected), (2) Economic Context (industry sector and business function), (3) Harm Details (type and 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

2 

severity of harm), (4) Data & Input (issues with training data or inputs), (5) AI Model (system characteristics), and (6) Task & Output (system function and autonomy level). The remaining two dimensions—metadata about the report and complementary contextual information—are acknowledged but considered outside the scope of this analysis. 

## _B. Dataset and Preprocessing_ 

The analysis uses the AI Incident Database (AIID) containing 4,826 reports covering 996 distinct incidents from 2006 through March 2025. Each report consists of a news article published in online media. It is essentially an unstructured narrative text with minimal metadata (e.g. incident date, reporter etc.). To process this corpus, we developed a three-stage automated pipeline: 

1) **Pre-processing:** We first cleaned the dataset (e.g. removing non-English stories and irrelevant text such as AIID announcements). We then designed a set of prompts, one for each classification dimension, with each prompt embedded in its own Python script. For example, to classify incident severity, the script provided the five severity categories (as instructed by OECD, classification) and their definitions (Hazard, Serious Hazard, Incident, Serious Incident, Disaster). The python script instructed the LLM model to choose the best fitting category and justify its choice (See Appendix A for an example). 

Similarly, prompts for other dimensions—such as stakeholders, harm types, industry sectors, and violated AI principles—were framed as guided by the OECD framework (e.g., “Who was harmed?” or “What kind of harm occurred?”). These prompts required the model to provide both a classification based on the OECD taxonomy and a brief justification for its choice. This requirement for dual outputs—categorization with explanation—enhanced interpretability, enabled detection of inconsistencies, and ensured outputs could be systematically verified against the original incident narratives rather than accepted as automatically valid. 

2) **Processing:** The prompts were fed into the DeepSeek-R10528 reasoning model (reasoning release, May 28) via API, using separate Python scripts for each classification dimension. For example, one script processed severity, another extracted industry sector, and others targeted stakeholder groups, harm category, violated AI principles, or autonomy level. Each script parsed the model’s classification and textual justifications and saved the results to a dedicated CSV file.  A full processing run for a single dimension across all 996 incidents typically took around 15 hours. To safeguard this process, _checkpoints_ were used so that interrupted runs could resume without starting over. Once completed, the CSV outputs were visually inspected for inconsistencies—for example, checking that severity was always within the defined categories and that no malformed entries appeared—before being used for subsequent analysis. 

The approach relied entirely on zero-shot reasoning (no finetuning), leveraging the model’s extensive pre-training to apply the OECD categories directly from prompts without task- 

specific datasets. This choice was pragmatic: creating labeled training data across nearly a thousand heterogeneous incidents would have been infeasible, while zero-shot classification allowed scalable, reproducible processing.  Prior research has shown that large language models can often perform classification tasks comparably to custom-trained models, thanks to their broad pre-training on diverse text [15]. Our results likewise found the DeepSeek-Reasoning Model’s outputs to be consistent and generally aligned with the incident narratives. In sum, it was this LLM-driven pipeline that made it possible to transform the unstructured incident reports into a rich structured dataset for systematic analysis. 

3) **Post-processing** : The structured outputs from the LLM pipeline were saved as dedicated CSV files—one for each classification dimension (e.g., harm type, stakeholder group, violated principle etc.). Each file included, at minimum, the incident ID, title, short description, and the full narrative text, along with the corresponding LLM-generated classification and its justification. 

These structured datasets formed the foundation for all subsequent analysis. Using standard Python libraries (e.g. pandas for data processing; matplotlib and seaborn for visualization), we generated exploratory visualizations across all categorized dimensions. The most salient and informative visualizations were selected and refined to clearly communicate the key trends and patterns identified in the data. The core findings from this analytical process are presented in the following section. 

## IV. RESULTS AND ANALYSIS 

This section presents the key findings derived from applying the LLM-driven pipeline to the AI Incident Database (AIID). To establish a foundational understanding of the scale and growth of documented AI failures, we begin by examining the distribution of incidents over time. 

_**a) AI incidents per year:**_ The frequency of AI incidents has grown exponentially in recent years. Figure 1 shows the number of incidents recorded per year, climbing sharply in the late 2010s and especially after 2020. Early on, incidents were rare (single-digits per year through 2014). But as AI deployment widened, reports surged – peaking at 150+ incidents in 2021 and 2022, and over 240 incidents in 2024 alone. This steep rise reflects both the increased adoption of AI in society and a greater awareness/reporting of failures. The drop in 2025 should be interpreted with caution, as it reflects partial-year data rather than a true decline. 

_**b) Distribution and evolution of AI incidents by severity:**_ As illustrated in Figure 2, we find that most of AIrelated failures result in actual harm events rather than mere near-misses. Over 90% of recorded cases were “incidents” or “serious incidents,” meaning the AI system directly caused harm or significant harm (e.g. financial loss, injuries, rights violations). By contrast, only a small fraction (under ~10%) 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

3 

were classified as hazards (potential harm not realized) or minor issues _._ 

safety-critical failures. Illustrative examples include wrongful arrests from false facial recognition matches [21], discriminatory credit or hiring algorithms causing economic and reputational damage, and generative AI systems spreading misinformation or deepfakes that erode trust [22]. Physical harms—such as injuries from autonomous vehicle accidents [23]—are present but represent a smaller share of the overall picture. 

Fig. 1. _AI-related incidents per year_ 

Fig. 3. _Distribution of AI incident harm types_ 

Fig. 2. _Distribution and evolution of incidents by severity classification_ 

We also observed a concerning pattern over time: by 2024, high-severity incidents outnumbered lower-severity ones in yearly totals. In other words, not only are AI incidents becoming more common, but a greater proportion of them involve serious harm or even disaster-level outcomes (though true “disasters” remain very rare). 

_**c) Distribution of AI incident harm types:**_ AI incidents can cause a spectrum of harms. We categorized each incident by its primary harm type. Strikingly, the incidents are dominated by harms to humans’ rights and economic wellbeing, as shown in Figure 3. The largest share of incidents (over 40%) involved violations of civil liberties or human rights – for instance, unfair or biased AI decisions affecting dignity, justice or privacy. The next most common (~20%) were economic harms, such as financial losses or property damage. Together, these “human and economic” categories make up the majority of AI incident harms. In contrast, physical harms (e.g. injuries) and environmental harms were relatively less frequent (each well under 10%). 

_**d) Frequency of AI ethical principles violated in incidents.**_ The results, summarized in Figure 4, show that lack of transparency (opacity) is the most frequent issue in the incidents. Over 180 incidents involved AI systems operating as “black boxes” without explainability or clarity to stakeholders. This “Opacity crisis” means that in many failures, users or regulators could not discern how or why the AI made a harmful decision [24]. Fairness is the second most frequently violated principle, with approximately 160 incidents involving bias or discrimination. Safety (the principle of avoiding harm) is the next most common, reflecting incidents where AI caused physical or psychological injury despite safety being a core requirement. 

Although all categories of harm have increased in recent years, the sharpest rise has been in these non-physical harms, reflecting how AI’s growing presence in social, economic, and informational domains expands the range of risks beyond 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

4 

## Fig. 4. _AI ethical principles violated in incidents_ 

_**e) Industry-Business function cross analysis:**_ The Sankey diagram (figure 5) offers a combined perspective on where AI incidents originate inside organizations and where they manifest across industries. What stands out immediately is the dominance of the ICT & Information Security function, which accounts for more than three-quarters of all incidents. Most of these flow directly into the Information and Communication sector – the core of the digital economy, including software, internet platforms, and technology providers. This is expected: the tech sector is both the birthplace and frontline of AI adoption, and thus records the highest number of failures at scale. 

**==> picture [227 x 146] intentionally omitted <==**

**----- Start of picture text -----**<br>
Business Function → Industry Classification<br>Analysis of Top 10 Functions and Top 10 Industries (Minimum 3 incidents per flow)<br>Business Functions Industry Sectors<br>Information & Communication (227)<br>—E<br>ICT Management & Information Security (593) a Arts/Entertainment & Recreation (37)<br>Wholesale/Retail Trade (49)<br>Sea2 —__— Public Administration & Defence (104)Financial and insurance (41)<br>—————————— Sales (3) Healthcare & Social Work (47)<br>Marketing & Advertisement (30) Education (38)<br>Research & Development (33) Other Industries (43)<br>Production (9)<br>— Monitoring & Quality Control (18)Compliance & Justice (16) ———S=_ Transportation & Storage (87)<br>Customer Service (9) Administrative & Support Services (19)<br>Human Resources (13)Logistics (3) Manufacturing (35)<br>**----- End of picture text -----**<br>


Fig. 5. _Cross-distribution of incidents by organizational function and industry sector_ 

But the Sankey also shows that these failures do not remain confined to technology firms. Large flows extend into Public Administration & Defence (104 incidents), where AI missteps in government services and public decision-making raise concerns over accountability and civil liberties. Another major stream connects to Transportation & Storage (87 incidents), where failures often carry higher severity – from autonomous vehicle collisions to disruptions in logistics networks [25]. Smaller functions also reveal distinct patterns in the Sankey flows. Research & Development (33 incidents) links primarily to healthcare and manufacturing, reflecting risks when experimental AI systems are tested in clinical or industrial contexts.  Marketing & Advertising (30 incidents) connects to retail, entertainment, and ICT, where personalization engines and ad-targeting algorithms have triggered reputational crises and discriminatory outcomes [6]. 

_**f) Affected Stakeholders** :_ A crucial aspect of AI incidents is who suffers the consequences. As shown in Figure 6, the general public and civil society are the most frequently affected stakeholders in AI incidents.  For instance, incidents of algorithmic misinformation or biased policing don’t just harm one person, but affect entire  communities _._ 

Individual consumers/users were also very commonly impacted (e.g. a user being fired by an AI service). We also see businesses themselves as victims in many incidents (e.g. a company from Singapore losing money due to deepfake CFO scam). Notably, vulnerable or underrepresented groups are not spared – the data shows dozens of incidents affecting children and other marginalized groups. Children have been affected by 

unsafe AI recommendations or games, employees by AI-driven surveillance and unfair HR algorithms [27]. 

Fig. 6. _Stakeholder groups affected by AI incidents_ 

_**g) Task type and task autonomy cross analysis** :_ Finally, we examined what the AI systems were trying to do in these incidents and how autonomously they were operating. We categorized each case by the task type of the AI (e.g. content generation, prediction/forecasting, decision support, recognition, etc.) and the level of autonomy it had (ranging from fully automated decisions to those requiring human approval). Figure 9 presents a heatmap of incidents by task vs. autonomy. 

A few clear patterns emerge. Generative AI systems (content generation tasks) stand out as a major source of failures, especially at high autonomy. For example, there were 231 incidents involving fully autonomous generative AIs – systems like deepfake generators creating misleading content, or large language models producing harmful text with no human oversight [28]. This suggests the notion that generative AI is a dominant source of real-world AI failures in recent years. 

Tasks such as forecasting/prediction, also show significant incident counts, particularly when the AI had medium to high autonomy. We observe that truly safety-critical tasks often still involve human supervision (low or no autonomy) – for instance, AI in medical diagnosis is usually deployed with a human in the loop, and accordingly our data shows fewer highautonomy incidents in those areas. Incidents in the medium autonomy zone often reflect a “transitional fragility” – when the handoff between AI and human control is poorly defined, critical issues can go undetected 

Overall, “High-action autonomy” dominates incident reports. The vast majority of incidents occurred with AI systems that were allowed to act or decide without mandatory human intervention. This isn’t surprising – autonomy gives AI power to cause harm quickly – but it underscores the trade-off between efficiency and control. 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

5 

Fourth, our results indicate that bias mitigation and “equity by design” need to be integral to AI development. Given how many incidents involved discrimination or unfair outcomes, it is clear that simply hoping for fairness isn’t working. We join other experts in calling for proactive bias testing and mitigation throughout the AI lifecycle [30] 

Fifth, our analysis highlights the importance of continuous monitoring and accountability throughout an AI system’s lifecycle, AI risks do not end at deployment; models can drift and new failure modes can emerge. To catch these, ongoing monitoring and post-deployment evaluation are crucial. An AI system might need to pass certain tests or audits to be certified for use, and certified systems would be subject to ongoing compliance checks 

Fig. 7. _Heatmap of incident count by AI task type (rows) vs. autonomy level of the AI system (columns_ 

## V. DISCUSSION 

The findings from our LLM-based analysis of the AIID database highlight that AI failures are neither isolated nor hypothetical; they represent systemic and recurring risks that demand greater attention. In this section, we interpret these results with a focus on governance implications. 

First, this study suggests that organizations using AI should be required to report serious AI incidents to a relevant authority or public database. Much like aviation or medicine, a culture of reporting near-misses and accidents can significantly improve safety over time. A formal mechanism (possibly governmentrun) for confidential reporting would facilitate industry-wide learning from failures. This also creates accountability: companies know they cannot just simply hide AI failures. 

Second, a large share of incidents in the database come from opacity — AI systems that operate as “black boxes.” When people cannot see why a system made a decision, trust and accountability collapse. Requiring more transparency is therefore critical. Developers should provide clear explanations of how systems work and why they produce certain outcomes, especially in high-stakes areas. Independent audits of AI systems for errors, bias, or misuse should also be part of this effort. 

Third, our results show that most failures come from AI systems working with high autonomy. However, even when humans are “in the loop,” oversight often fails because operators, either overly trust the AI or do not keep engaged. This means that human oversight has to be designed carefully. This finding resonates with prior human factors research showing that poorly designed human–machine teaming can produce new classes of error [29].  For governance, this suggests that policies cannot stop at mandating “human oversight.”  Instead, oversight must be effective, informed, and meaningful supported by training, interface design, and clear lines of accountability. 

Implementing these governance measures would address many of the failure modes identified in our analysis. A balanced approach combining regulation and industry best practices is needed to ensure the safe development of AI systems. Insights from the AI Incident Database can help regulators and industry leaders focus their efforts on key priorities—such as enforcing rules and standards for transparency and bias, and strengthening oversight and internal controls in sectors with a record of frequent or severe incidents. 

## VI. CONCLUSION 

This paper demonstrated how a Large Language Model can transform an unstructured collection of AI incident reports into structured insights, and to use those insights to inform AI governance. In achieving this, we have made two contributions. First, on a substantive level, we provided data-driven evidence of key problem areas in current AI deployment: the exponential growth of incidents, the predominance of human and civil rights harms, the concentration in certain sectors and functions, and the frequent violations of principles like transparency and fairness.  These findings point to concrete areas where AI practice and policy must improve. For instance, knowing that most incidents involve lack of transparency or biased outcomes gives regulators specific targets for new rules (such as documentation requirements and bias testing), and it gives developers a checklist of pitfalls to avoid when building systems. 

By systematically classifying ~1,000 incident reports, we turned narrative news reports onto quantifiable trends and patterns. Such evidence can support more evidence-based AI governance – ensuring that rules address the most pressing failures that are actually occurring, rather than hypothetical scenarios. 

Second, on a methodological level, we showcased a scalable LLM-based pipeline for analyzing narrative incident data. We demonstrated that a state-of-the-art reasoning language model (DeepSeek-R1, May 2025) could be guided by the OECD 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 6 

incident framework to perform zero-shot classification across thousands of reports with consistency. This approach required no task-specific training data – the model’s broad knowledge was harnessed through carefully designed prompts to categorize incidents by harm type, sector, stakeholder, etc. 

The success of this approach indicates that LLMs can serve as effective tools for structuring and extracting knowledge from unstructured text datasets. In our case, the LLM essentially acted as an automated analyst, reading each incident story and mapping it to a standard schema. The outcome was a rich structured dataset that enabled the analysis in this paper. 

We see this as a proof-of-concept for AI-assisted analysis in AI safety research – by using AI to analyze AI failures, researchers can more quickly identify patterns that might be missed by manual review. The LLM approach is not infallible (and we took steps like justification and human verification to ensure quality), but it greatly accelerates the process. Our work, therefore, illustrates a practical technique for turning the deluge of AI incident news into actionable intelligence. 

There are several avenues for future research. First, the classification process could be enhanced with expert feedback or fine-tuning of the LLM on incident data to improve accuracy. Second, integration with policy frameworks and educational tools could amplify the impact – e.g., creating an interactive dashboard for policymakers –  based on the OCDE framework– to explore incident trends, or incorporating incident case studies into AI ethics training. Third, AI ethics training programs could make use of curated incident case studies (drawn from the database) to illustrate what can go wrong. Recent work has suggested that using real incident cases in the classroom significantly improves students’ awareness of AI risks [31]. By connecting the AIID to curricula, we can cultivate a new generation of practitioners who are keenly aware of past failures and how to avoid them. 

In conclusion, this study shows that systematically analyzing AI incidents is essential for building safer and more accountable systems. By using Large Language Models to transform unstructured reports in the AI Incident Database into structured, actionable insights, we can uncover recurring patterns of failure and identify areas where governance must improve. These insights can contribute to stronger norms, standards, and safeguards, helping both regulators and developers address the most pressing risks. Turning past failures into guidance for future design and policy ensures that as AI systems become more powerful, they also become more reliable, transparent, and aligned with human values. 

## REFERENCES 

- [1] M. Tehseen et al. “Generative AI, IoT, and blockchain in healthcare: application, issues, and solutions” Discover Internet of Things, vol. 5, (1), pp. 5, 2025. 

- [2] S. Pazouki et al. "Artificial Intelligence and Digital Technologies in Finance: A Comprehensive Review," Journal of Economics, Finance, and Accounting Studies, vol. 7, (2), pp. 54-69, 2025. 

- [3] A. E. Bernardelli and P. Giudici, "AI Risk Management: A Bibliometric Analysis," Risks, vol. 13, (7), pp. 131, 2025. 

- [4] R. Cary et. al, "Mitigating Racial and Ethnic Bias and Advancing Health Equity In Clinical Algorithms: A Scoping Review," Health Aff., vol. 42, (10), pp. 1359-46, 

- [5] de Castro Vieira José Rômulo et al, "Towards Fair AI: Mitigating Bias in Credit Decisions—A Systematic Literature Review," Journal of Risk and Financial Management, vol. 18, (5), pp. 228, 2025 

- [6] H. Kim et al, "A Comprehensive Traffic Accident Investigation System for Identifying Causes of the Accident Involving Events with Autonomous Vehicle," J. Adv. Transport., vol. 2024, 2024. 

- [7] J. Brown, "We Don't All Look the Same: Police Use of Facial Recognition and the Brady Rule," Fed. Commun. Law J., vol. 74, (3), pp. 329-351, 2022. 

- [8] S. McGregor, Preventing Repeated Real World AI Failures by Cataloging Incidents: The AI Incident Database. Proceedings of the AAAI Conference on Artificial Intelligence, 35(17), 15458-15463, 2021 

- [9] K. Paeth, et al. “Lessons for Editors of AI Incidents from the AI Incident Database”. Proceedings of the AAAI Conference on Artificial Intelligence, 39(28), 28946-28953. 2025 

- [10] K. I. Roumeliotis, N. D. Tselikas and D. K. Nasiopoulos, "Fake News Detection and Classification: A Comparative Study of Convolutional Neural Networks, Large Language Models, and Natural Language Processing Models," Future Internet, vol. 17, (1), pp. 28, 2025. 

- [11] OECD, “Towards a common reporting framework for AI incidents” OECD Artificial Intelligence Papers, 28 February 2025. 

- [12] OECD. OECD AI Incidents Monitor, an evidence base for trustworthy AI. https://oecd.ai/en/incidents. 2025, Accessed: 2025/8/8, 

- [13] M. Hoffman and H. Frase, “Adding Structure to AI Harm - An Introduction to CSET’s AI Harm Framework,” 2023. [Online]. Available: https://cset.georgetown.edu/wp-content/uploads/20230022-Addingstructure-to-AI-Harm-FINAL.pdf 

- [14] N. Pittaras and S. McGregor, “A taxonomic system for failure cause analysis of open source AI incidents,” arXiv preprint arXiv:2211.07280, 2022. [Online]. Available: https://arxiv.org/abs/2211.07280 

- [15] P. Slattery et al., “The AI Risk Repository: A Comprehensive Meta‑Review, Database, and Taxonomy of Risks from Artificial Intelligence,” preprint, Aug. 2024. [Online]. Available: https://doi.org/10.48550/arXiv.2408.12622. 

- [16] S. Vajjala and S. Shimangaud, Text Classification in the LLM Era -- Where do we stand?, arXiv preprint arXiv:2502.11830, 2025. 

- [17] R. Wei and Y. Zhou, “AI ethics issues in real world: Evidence from AI Incident Database,” arXiv preprint arXiv:2209.07384, 2022. [Online]. Available: https://arxiv.org/abs/2209.07384 

- [18] A. Wang, H. Zhang, J. Kim, and E. Chi, “Farsight: Fostering responsible AI awareness during AI application prototyping,” in Proc. CHI Conf. Human Factors in Computing Systems, Honolulu, HI, USA, Apr. 2024. [Online]. Available: https://arxiv.org/abs/2403.09710 

- [19] D. Russo, G. M. Orlando, V. La Gatta, and V. Moscato, “Automating AI Failure Tracking: Semantic Association of Reports in AI Incident Database,” arXiv preprint arXiv:2507.23669, 2025. [Online]. Available: https://arxiv.org/abs/2507.23669 

- [20] T. Dong, Q. Yang, N. Ebadi, X. R. Luo, and P. Rad, “Identifying Incident Causal Factors to Improve Aviation Transportation Safety: Proposing a Deep Learning Approach,” Journal of Advanced Transportation, vol. 2021, Article ID 5540046, 15 pages, Jun. 14, 2021 

- [21] A. Daniel, “Atherton Facial Recognition Error Reportedly Leads to Wrongful Arrest of Georgia Man and $200K Settlement in Louisiana” https://incidentdatabase.ai/cite/515/, 2023 

- [22] A. Daniel “Yahoo Boys Allegedly Used Deepfake Technology to Impersonate Brad Pitt and Defraud French Woman of $850,000 in Romance Scam” https://incidentdatabase.ai/cite/92/, 2025 

- [23] L. Khoa “Tesla Allegedly on Autopilot Struck High School Student Exiting School Bus” https://incidentdatabase.ai/cite/550/, 2023 

- [24] L. Khoa “How were GCSE and A-level grades originally decided?” https://incidentdatabase.ai/cite/374/, 2020 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

7 

- [25] M. Sean “Warehouse robot ruptures can of bear spray and injures workers” https://incidentdatabase.ai/cite/2/, 2018 

## APPENDIX B 

- [26] M. Sean, “Sexist and Racist Google Adsense Advertisements” https://incidentdatabase.ai/cite/19/, 2013, 

- [27] M. Sean, “Google’s YouTube Kids App Presents Inappropriate Content” https://incidentdatabase.ai/cite/1/, 2015 

- [28] A. Daniel “Multiple LLMs Allegedly Endorsed Suicide as a Viable Option During Non-Adversarial Mental Health Venting Session” https://incidentdatabase.ai/cite/1026/, 2025 

- [29] R. Parasuraman and V. Riley, "Humans and automation: Use, misuse, disuse, abuse," Human Factors, vol. 39, no. 2, pp. 230–253, 1997, doi: 10.1518/001872097778543886. 

- [30] J. M. Alvarez, A. B. Colmenarejo, A. Elobaid, et al., "Policy advice and best practices on bias and fairness in AI," Ethics and Information Technology, vol. 26, no. 2, p. 31, 2024, doi: 10.1007/s10676-024-09746w. 

- [31] M. Feffer, N. Martelaro, and H. Heidari, "The AI Incident Database as an educational tool to raise awareness of AI harms: A classroom exploration of efficacy, limitations, and future improvements," in Proc. 3rd ACM Conf. Equity and Access in Algorithms, Mechanisms, and Optimization (EAAMO '23), Boston, MA, USA, 2023, pp. 3:1-3:11, doi 

## APPENDIX A 

Authorized licensed use limited to: SUNY AT STONY BROOK. Downloaded on June 24,2026 at 18:28:43 UTC from IEEE Xplore.  Restrictions apply. 

8 

