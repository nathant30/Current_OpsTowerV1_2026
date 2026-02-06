# QUICKSTART - Multi-Agent Coordination System

## Overview

This guide helps you get started with the Multi-Agent Coordination System for building OpsTower. The system uses a 3-tier architecture with specialized coordinators and sub-agents working together systematically.

## System Architecture

### Three Tiers

1. **Tier 1: Project Coordinator**
   - Central orchestrator
   - Delegates to domain coordinators
   - Maintains overall project vision

2. **Tier 2: Domain Coordinators** (6 types)
   - Product & Design Coordinator
   - Development Coordinator
   - QA Coordinator
   - Security Coordinator
   - Docs & Git Coordinator
   - Review Coordinator

3. **Tier 3: Sub-Agents** (specialized workers)
   - Frontend Agent, Backend Agent
   - QA Agent, Test Agent
   - Security Agent, Audit Agent
   - Docs Agent, Git Agent
   - Code Review Agent, Architecture Agent
   - Design Agent

## Quick Start Steps

### Step 1: Initialize Project State

Create the central `PROJECT_STATE.md` file in the project root:

```bash
cd /Users/nathan/Desktop/Current_OpsTowerV1_2026
touch PROJECT_STATE.md
```

**Initial PROJECT_STATE.md Structure:**

```markdown
# OpsTower Project State

**Last Updated**: [Timestamp]
**Current Phase**: Pre-Launch → Production Ready
**Updated By**: Project Coordinator

## Current Sprint

**Sprint Goal**: Complete P0 Critical Issues for Production Launch
**Start Date**: [Date]
**Target End Date**: [Date]

## Active Work

### In Progress
- [Issue #] - [Title] - Assigned to: [Coordinator/Agent]
  - Status: [Status]
  - Blockers: [None/List blockers]
  - ETA: [Date]

### Blocked
[List any blocked items]

### Recently Completed
[List completed items]

## Coordinators Status

### Product & Design Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

### Development Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

### QA Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

### Security Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

### Docs & Git Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

### Review Coordinator
- Status: Ready
- Active Tasks: 0
- Notes: Awaiting task assignment

## Dependencies

### Critical Path
1. [Issue #13] Remove hardcoded secrets → Blocks all deployment
2. [Issue #14] Implement HTTPS → Blocks production launch
3. [Issue #15] Database encryption → Blocks compliance

### Integration Dependencies
[List cross-coordinator dependencies]

## Risks & Issues

### Critical Risks
[List any critical risks]

### Open Questions
[List any questions needing resolution]

## Next Steps

1. [Next immediate action]
2. [Following action]
3. [Subsequent action]

## Verification Status

**Last Verification**: [Never run / Timestamp]
**Status**: [Pass / Fail]
**Issues Found**: [None / List issues]
```

### Step 2: Set Up Verification

Ensure the project has a verification script:

```bash
# Check if verification script exists
cat package.json | grep "verify-project"
```

If missing, add to `package.json`:

```json
{
  "scripts": {
    "verify-project": "npm run lint && npm run type-check && npm test"
  }
}
```

### Step 3: Run Initial Verification

```bash
npm run verify-project
```

**Expected Output:**
- ✓ Linting passes
- ✓ Type checking passes
- ✓ Tests pass

If verification fails, document issues in PROJECT_STATE.md before proceeding.

### Step 4: Review GitHub Issues

All OpsTower work is tracked in GitHub:

```bash
# View all open issues
gh issue list --repo nathant30/Current_OpsTowerV1_2026

# View by priority
gh issue list --repo nathant30/Current_OpsTowerV1_2026 --label "priority: critical"
```

**Current Issue Breakdown:**
- **P0 (Critical)**: 4 issues - Must complete for launch
- **P1 (High)**: 8 issues - Required for production
- **P2 (Medium)**: 5 issues - Important for quality
- **P3 (Low)**: 2 issues - Nice to have

### Step 5: Assign First Tasks

The Project Coordinator assigns work to domain coordinators based on issue priority.

**Example Assignment:**

```markdown
## Task Assignment: Security Coordinator

**From**: Project Coordinator
**To**: Security Coordinator
**Date**: [Date]

### Tasks Assigned

1. **Issue #13: Remove hardcoded secrets**
   - Priority: P0 (Critical)
   - Type: security
   - Estimated Effort: 8 hours
   - Acceptance Criteria:
     * All secrets moved to secure environment variables
     * No secrets in codebase (verified by gitleaks)
     * All secrets stored in secure vault (not .env files)
     * Documentation updated with secrets management guide
   - Dependencies: None
   - Deadline: [Date]

2. **Issue #14: Implement HTTPS**
   - Priority: P0 (Critical)
   - Type: security
   - Estimated Effort: 4 hours
   - Dependencies: Depends on #13
   - Deadline: [Date]

### Context

OpsTower is a Philippine ridesharing platform currently at 70-80% completion. These P0 security issues are blocking production deployment. The codebase uses:
- Next.js 15 with App Router
- PostgreSQL + Redis
- Socket.io for real-time features
- Deployed on Railway/Vercel

### Success Criteria

- All tasks completed and verified
- Tests passing
- PROJECT_STATE.md updated
- Handoff to Review Coordinator for validation

### Resources

- Security documentation: `/docs/security/`
- Environment setup: `.env.example`
- GitHub Issues: https://github.com/nathant30/Current_OpsTowerV1_2026/issues
```

## Coordinator Workflow

### Every Coordinator Follows This Pattern:

#### 1. Receive Assignment
- Read task assignment from Project Coordinator
- Acknowledge receipt
- Note any immediate questions or concerns

#### 2. Read Project State
```bash
cat PROJECT_STATE.md
```
- Understand current project status
- Check for dependencies or blockers
- Review active work by other coordinators

#### 3. Verify Project
```bash
npm run verify-project
```
- Ensure project is in valid state
- If verification fails:
  - Document failures in PROJECT_STATE.md
  - Report to Project Coordinator
  - Do not proceed until resolved

#### 4. Analyze & Plan
- Break down assigned tasks
- Identify which sub-agents to delegate to
- Create execution plan with milestones

#### 5. Delegate to Sub-Agents
- Provide clear, specific instructions
- Include acceptance criteria
- Set deadlines and check-in points

#### 6. Monitor Progress
- Regular check-ins with sub-agents
- Address blockers promptly
- Keep PROJECT_STATE.md updated

#### 7. Validate Results
- Review all completed work
- Run tests and verification
- Ensure acceptance criteria met

#### 8. Update State
```markdown
# Update PROJECT_STATE.md

## Active Work

### Recently Completed
- [Issue #13] - Remove hardcoded secrets - Completed by: Security Coordinator
  - Date: [Date]
  - Result: All secrets moved to environment variables, gitleaks passing
  - Next: Needs Review Coordinator validation
```

#### 9. Report Completion
```markdown
## Completion Report: Security Coordinator

**From**: Security Coordinator
**To**: Project Coordinator
**Date**: [Date]

### Tasks Completed

✓ **Issue #13: Remove hardcoded secrets**
- All secrets moved to secure environment variables
- Gitleaks scan passing (0 secrets found)
- Documentation updated
- PR: #[PR number]

### Verification Results
- npm run verify-project: ✓ Pass
- Security scans: ✓ Pass
- Tests: ✓ All passing (128/128)

### Handoff
- Ready for Review Coordinator validation
- Unblocks Issue #14 (HTTPS implementation)

### Notes
[Any observations, recommendations, or next steps]
```

## Communication Standards

### Task Assignments (Coordinator → Sub-Agent)

```markdown
## Task: [Clear, specific title]

**Assigned To**: [Agent name]
**Priority**: [P0/P1/P2/P3]
**Estimated Effort**: [Hours/Days]
**Deadline**: [Date]

### Objective
[1-2 sentences describing what needs to be done]

### Context
[Relevant background information]

### Acceptance Criteria
1. [Specific, measurable criterion]
2. [Specific, measurable criterion]
3. [Specific, measurable criterion]

### Resources
- [Link to relevant docs]
- [Related files]
- [API documentation]

### Dependencies
[Any prerequisites or blockers]

### Success Criteria
[How we know this is complete]
```

### Status Updates (Sub-Agent → Coordinator)

```markdown
## Status Update: [Task title]

**From**: [Agent name]
**Date**: [Date]
**Status**: [In Progress / Blocked / Complete]

### Progress
[What has been completed]

### Current Work
[What is currently being worked on]

### Blockers
[Any issues preventing progress]

### Next Steps
[What will be done next]

### ETA
[Estimated completion date]
```

### Completion Reports (Sub-Agent → Coordinator)

```markdown
## Completion Report: [Task title]

**From**: [Agent name]
**Date**: [Date]

### Work Completed
- [Item 1]
- [Item 2]
- [Item 3]

### Verification
- Tests: ✓ [Pass/Fail]
- Linting: ✓ [Pass/Fail]
- Manual Testing: ✓ [Pass/Fail]

### Files Changed
- [File path 1]
- [File path 2]

### Next Steps
[Handoff instructions or follow-up needed]
```

## Best Practices

### DO ✓
- Always read PROJECT_STATE.md before starting work
- Run verification before and after changes
- Update state immediately after completing work
- Use structured communication formats
- Document blockers clearly and promptly
- Test your changes thoroughly
- Provide clear handoff instructions

### DON'T ✗
- Start work without reading current state
- Skip verification steps
- Make assumptions about dependencies
- Work on blocked tasks
- Forget to update PROJECT_STATE.md
- Submit incomplete work
- Leave blockers unresolved without escalation

## Common Patterns

### Pattern 1: Sequential Dependencies

```markdown
Issue #13 → Issue #14 → Issue #15

1. Security Coordinator completes #13
2. Updates PROJECT_STATE.md
3. Reports to Project Coordinator
4. Project Coordinator assigns #14 to Security Coordinator
5. Repeat
```

### Pattern 2: Parallel Execution

```markdown
Security Coordinator: Issues #13, #14, #15
Development Coordinator: Issues #16, #18
QA Coordinator: Issue #25

All can work simultaneously (no dependencies)
```

### Pattern 3: Cross-Coordinator Handoff

```markdown
1. Development Coordinator completes feature
2. Hands off to QA Coordinator for testing
3. QA Coordinator validates and reports results
4. Review Coordinator performs code review
5. Docs & Git Coordinator updates documentation
6. Final sign-off from Project Coordinator
```

## Troubleshooting

### Verification Fails

**Problem**: `npm run verify-project` fails

**Solution**:
1. Read error messages carefully
2. Fix issues in order of priority
3. Re-run verification
4. Document any persistent issues in PROJECT_STATE.md
5. Report to Project Coordinator if blocked

### Blocked by Dependencies

**Problem**: Cannot start assigned task due to dependency

**Solution**:
1. Update PROJECT_STATE.md with blocker
2. Report to Project Coordinator immediately
3. Request alternative task assignment
4. Monitor dependency resolution

### Conflicting Changes

**Problem**: Another coordinator changed files you need

**Solution**:
1. Read PROJECT_STATE.md to understand changes
2. Coordinate with other coordinator
3. Merge changes carefully
4. Re-run verification
5. Update state with resolution

### Unclear Requirements

**Problem**: Task assignment lacks necessary details

**Solution**:
1. Document specific questions
2. Request clarification from Project Coordinator
3. Do not proceed with assumptions
4. Wait for explicit guidance

## Next Steps

1. **Review Your Coordinator Documentation**
   - Read the specific documentation for your coordinator role
   - Understand your responsibilities and scope
   - Review success criteria

2. **Check PROJECT_STATE.md**
   - See if any tasks are assigned to you
   - Review current project status
   - Note any dependencies

3. **Run Verification**
   - Ensure project is in valid state
   - Fix any issues found
   - Document results

4. **Begin First Task**
   - Follow the coordinator workflow
   - Communicate clearly and frequently
   - Update state regularly

## Resources

- [Domain Coordinators Overview](./DOMAIN_COORDINATORS.md)
- [Development Coordinator](./DEVELOPMENT_COORDINATOR.md)
- [Security Coordinator](./SECURITY_COORDINATOR.md)
- [QA Coordinator](./QA_COORDINATOR.md)
- [Product & Design Coordinator](./PRODUCT_DESIGN_COORDINATOR.md)
- [Docs & Git Coordinator](./DOCS_GIT_COORDINATOR.md)
- [Review Coordinator](./REVIEW_COORDINATOR.md)

## Success Criteria

You're ready to begin when:
- ✓ PROJECT_STATE.md exists and is current
- ✓ Verification script runs successfully
- ✓ You understand your coordinator role
- ✓ You've reviewed assigned tasks
- ✓ Communication channels are clear
- ✓ Dependencies are documented

---

**Remember**: The coordination system's strength comes from discipline, clear communication, and systematic execution. Follow the processes, update state diligently, and coordinate effectively with other team members.
