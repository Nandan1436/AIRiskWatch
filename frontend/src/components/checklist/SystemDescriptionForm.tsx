import { useState, type FormEvent } from "react";
import { WandSparkles } from "lucide-react";
import { Button, Card } from "../ui";
import styles from "./Checklist.module.css";

const EXAMPLE =
  "A customer-support chatbot for a retail bank. It answers account questions, can freeze cards, and can start transfers between a customer's own accounts after voice verification.";

interface SystemDescriptionFormProps {
  initialDescription: string;
  isLoading: boolean;
  onSubmit: (description: string) => void;
}

export function SystemDescriptionForm({ initialDescription, isLoading, onSubmit }: SystemDescriptionFormProps) {
  const [description, setDescription] = useState(initialDescription);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = description.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <Card
      title="Describe the AI system you're building or buying"
      description="We find similar past incidents and turn their MIT categories into a checklist."
    >
      <form onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={EXAMPLE}
          rows={4}
          aria-label="System description"
        />
        <div className={styles.formActions}>
          {!description && (
            <Button variant="ghost" size="sm" onClick={() => setDescription(EXAMPLE)}>
              Use an example
            </Button>
          )}
          <Button type="submit" disabled={isLoading || !description.trim()} className="ml-auto">
            <WandSparkles />
            {isLoading ? "Generating…" : "Generate checklist"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
