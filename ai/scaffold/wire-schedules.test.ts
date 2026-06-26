import { describe, it, expect } from "vitest";
import { workflowYaml } from "./wire-schedules.js";
import type { AgentConfig } from "../shared/agent-config.js";

const fixture: AgentConfig = {
  id: "test-agent",
  name: "Test Agent",
  schedule: "0 13 * * *",
  models: {
    triage: "claude-haiku-4-5",
    research: "claude-sonnet-4-5",
    write: "claude-sonnet-4-5",
  },
  tools: [],
  research: {
    maxSteps: 6,
    fetchLimit: 4000,
  },
};

describe("workflowYaml", () => {
  it('contains the cron schedule', () => {
    const yaml = workflowYaml(fixture);
    // Accept either double or single quotes around the cron expression.
    expect(yaml).toMatch(/cron: ["']0 13 \* \* \*["']/);
  });

  it('contains node-version 24', () => {
    const yaml = workflowYaml(fixture);
    expect(yaml).toContain("node-version: 24");
  });

  it('contains npm run agent <id>', () => {
    const yaml = workflowYaml(fixture);
    expect(yaml).toContain("npm run agent test-agent");
  });

  it('contains workflow_dispatch', () => {
    const yaml = workflowYaml(fixture);
    expect(yaml).toContain("workflow_dispatch");
  });
});
