# Domain Coordinators Overview

## Introduction

Domain Coordinators are Tier 2 agents in the Multi-Agent Coordination System. They receive high-level assignments from the Project Coordinator and delegate specific work to specialized Tier 3 Sub-Agents.

## The Six Domain Coordinators

### 1. Product & Design Coordinator

**Purpose**: Ensure user-centered design and clear product requirements

**Responsibilities**:
- Create and maintain Product Requirements Documents (PRDs)
- Design wireframes and user flows
- Maintain design system consistency
- Validate user experience
- Gather and prioritize user requirements

**Sub-Agents**:
- Design Agent: Creates wireframes, mockups, and UI specifications

**Key Deliverables**:
- Product Requirements Documents (PRDs)
- Wireframes and user flow diagrams
- Design specifications
- Component documentation
- UX validation reports

**When to Engage**:
- New feature requests
- User experience issues
- Design system updates
- Product direction changes

---

### 2. Development Coordinator

**Purpose**: Implement features and maintain codebase quality

**Responsibilities**:
- Implement new features
- Fix bugs and issues
- Maintain code quality
- Manage dependencies
- Ensure proper architecture

**Sub-Agents**:
- Frontend Agent: React/Next.js components, UI implementation
- Backend Agent: API routes, database operations, business logic

**Key Deliverables**:
- Working features
- Bug fixes
- Code refactoring
- Dependency updates
- Technical documentation

**When to Engage**:
- Feature implementation
- Bug fixes
- Performance optimization
- Code refactoring
- API development

---

### 3. QA Coordinator

**Purpose**: Ensure quality and reliability through comprehensive testing

**Responsibilities**:
- Create test plans
- Execute test cases
- Automate testing
- Validate acceptance criteria
- Report quality metrics

**Sub-Agents**:
- QA Agent: Manual testing, exploratory testing, test planning
- Test Agent: Automated test creation, test maintenance, test execution

**Key Deliverables**:
- Test plans
- Test cases and scripts
- Automated tests (unit, integration, E2E)
- Bug reports
- Quality metrics reports

**When to Engage**:
- After feature implementation
- Before releases
- Bug investigation
- Quality audits
- Performance testing

---

### 4. Security Coordinator

**Purpose**: Protect the application and user data from threats

**Responsibilities**:
- Conduct security audits
- Identify vulnerabilities
- Implement security measures
- Ensure compliance
- Monitor security metrics

**Sub-Agents**:
- Security Agent: Threat modeling, vulnerability assessment, security implementation
- Audit Agent: Security scanning, compliance checking, audit reporting

**Key Deliverables**:
- Security audit reports
- Vulnerability assessments
- Security fixes
- Compliance documentation
- Security guidelines

**When to Engage**:
- Security issues
- Authentication/authorization changes
- Data handling updates
- Compliance requirements
- Before production deployment

---

### 5. Docs & Git Coordinator

**Purpose**: Maintain clear documentation and organized version control

**Responsibilities**:
- Write and maintain documentation
- Manage Git workflows
- Create commit messages
- Write PR descriptions
- Maintain README files

**Sub-Agents**:
- Docs Agent: API docs, user guides, technical documentation, inline comments
- Git Agent: Commit messages, PR descriptions, Git workflows, branch management

**Key Deliverables**:
- API documentation
- User guides
- Technical documentation
- Commit messages
- PR descriptions
- README updates

**When to Engage**:
- New features (documentation needed)
- API changes
- Code commits
- Pull requests
- Documentation updates

---

### 6. Review Coordinator

**Purpose**: Maintain code quality and architectural integrity

**Responsibilities**:
- Conduct code reviews
- Validate architecture decisions
- Ensure best practices
- Check code style
- Verify standards compliance

**Sub-Agents**:
- Code Review Agent: Code quality, readability, best practices, test coverage
- Architecture Agent: Design patterns, scalability, maintainability, technical debt

**Key Deliverables**:
- Code review reports
- Architecture assessments
- Refactoring recommendations
- Best practice guidelines
- Technical debt analysis

**When to Engage**:
- Pull request reviews
- Architecture changes
- Major refactoring
- Technical debt assessment
- Standards compliance

---

## Coordinator Interaction Matrix

### Who Works With Whom

| Coordinator | Frequently Collaborates With | Why |
|------------|------------------------------|-----|
| **Product & Design** | Development, QA | Features need implementation and testing |
| **Development** | All coordinators | Central to all technical work |
| **QA** | Development, Security | Tests implementation and security |
| **Security** | Development, Review | Security requires implementation and review |
| **Docs & Git** | All coordinators | Documents all work, manages commits |
| **Review** | Development, Security | Reviews code and security implementations |

### Typical Workflow Chains

#### New Feature Flow
```
Product & Design → Development → QA → Review → Docs & Git
```

1. Product & Design creates PRD and wireframes
2. Development implements feature
3. QA tests implementation
4. Review validates code quality
5. Docs & Git documents and commits

#### Security Issue Flow
```
Security → Development → QA → Review → Docs & Git
```

1. Security identifies vulnerability
2. Development implements fix
3. QA validates fix doesn't break functionality
4. Review ensures best practices followed
5. Docs & Git documents security update

#### Bug Fix Flow
```
QA → Development → QA → Review → Docs & Git
```

1. QA identifies and reports bug
2. Development fixes bug
3. QA validates fix
4. Review checks fix quality
5. Docs & Git documents resolution

---

## Coordinator Lifecycle

### Phase 1: Assignment Reception

**Input**: Task assignment from Project Coordinator

**Actions**:
1. Read assignment details
2. Acknowledge receipt
3. Note any immediate questions
4. Review PROJECT_STATE.md

**Output**: Confirmation of understanding

### Phase 2: State Assessment

**Input**: PROJECT_STATE.md, verification results

**Actions**:
1. Read current project state
2. Run `npm run verify-project`
3. Check for blockers
4. Identify dependencies

**Output**: Readiness assessment

### Phase 3: Planning

**Input**: Task details, project context

**Actions**:
1. Break down task into sub-tasks
2. Identify which sub-agents to engage
3. Create execution timeline
4. Note resource requirements

**Output**: Execution plan

### Phase 4: Delegation

**Input**: Execution plan

**Actions**:
1. Create sub-agent assignments
2. Provide clear instructions
3. Set milestones and checkpoints
4. Establish communication cadence

**Output**: Sub-agent task assignments

### Phase 5: Monitoring

**Input**: Sub-agent status updates

**Actions**:
1. Track progress against milestones
2. Address blockers
3. Coordinate with other coordinators
4. Update PROJECT_STATE.md

**Output**: Progress reports

### Phase 6: Validation

**Input**: Sub-agent completed work

**Actions**:
1. Review deliverables
2. Verify acceptance criteria met
3. Run tests and validation
4. Request revisions if needed

**Output**: Validated deliverables

### Phase 7: Integration

**Input**: Validated work

**Actions**:
1. Integrate into codebase
2. Run full verification
3. Update documentation
4. Prepare handoff

**Output**: Integrated changes

### Phase 8: Reporting

**Input**: Completed work

**Actions**:
1. Document results
2. Update PROJECT_STATE.md
3. Create completion report
4. Hand off to next coordinator

**Output**: Completion report to Project Coordinator

---

## Coordinator Standards

### Communication Standards

All coordinators must:
- Use structured markdown formats
- Update PROJECT_STATE.md promptly
- Report blockers immediately
- Provide clear handoff instructions
- Document decisions and rationale

### Quality Standards

All coordinators must:
- Verify work before marking complete
- Ensure tests pass
- Follow coding standards
- Update documentation
- Check for regressions

### Coordination Standards

All coordinators must:
- Read PROJECT_STATE.md before starting
- Check for dependencies
- Communicate with affected coordinators
- Avoid duplicate work
- Resolve conflicts promptly

---

## Best Practices by Coordinator

### Product & Design Coordinator
- ✓ Always include user perspective
- ✓ Create visual mockups for clarity
- ✓ Validate with user flows
- ✓ Document design decisions
- ✗ Don't skip wireframes for "simple" features

### Development Coordinator
- ✓ Write tests alongside code
- ✓ Follow existing patterns
- ✓ Document complex logic
- ✓ Consider edge cases
- ✗ Don't skip verification steps

### QA Coordinator
- ✓ Test both happy and unhappy paths
- ✓ Automate repetitive tests
- ✓ Document test scenarios
- ✓ Report issues with reproduction steps
- ✗ Don't approve without testing

### Security Coordinator
- ✓ Think like an attacker
- ✓ Verify all user inputs
- ✓ Check authentication/authorization
- ✓ Scan for known vulnerabilities
- ✗ Don't assume code is secure

### Docs & Git Coordinator
- ✓ Write for the target audience
- ✓ Include examples
- ✓ Keep docs updated with code
- ✓ Use clear commit messages
- ✗ Don't leave outdated documentation

### Review Coordinator
- ✓ Provide constructive feedback
- ✓ Explain reasoning
- ✓ Suggest improvements
- ✓ Validate architecture decisions
- ✗ Don't approve without thorough review

---

## Coordinator Metrics

### Performance Indicators

Each coordinator tracks:
- **Tasks Completed**: Number of tasks finished
- **Time to Complete**: Average task duration
- **Quality**: Defect rate in delivered work
- **Blockers**: Number and duration of blockers
- **Collaboration**: Effectiveness of cross-coordinator work

### Success Criteria

A successful coordinator:
- Completes tasks on schedule
- Delivers high-quality work
- Communicates clearly and promptly
- Identifies and resolves blockers
- Collaborates effectively with others
- Maintains updated documentation
- Follows processes consistently

---

## Escalation Paths

### When to Escalate to Project Coordinator

- **Critical Blockers**: Cannot proceed and blocking others
- **Resource Conflicts**: Multiple coordinators need same resources
- **Scope Changes**: Requirements significantly different than expected
- **Timeline Issues**: Cannot meet deadlines
- **Quality Concerns**: Work doesn't meet standards
- **Cross-Coordinator Conflicts**: Disagreement on approach

### Escalation Format

```markdown
## Escalation: [Brief description]

**From**: [Coordinator name]
**To**: Project Coordinator
**Priority**: [Critical / High / Medium]
**Date**: [Date]

### Issue
[Clear description of the problem]

### Impact
[What is blocked or at risk]

### Attempted Solutions
[What has been tried already]

### Recommendation
[Suggested resolution]

### Timeline
[How urgent is this]
```

---

## OpsTower Specific Guidance

### Current Context

**Project**: OpsTower (Philippine ridesharing platform)
**Phase**: Pre-Launch → Production Ready
**Open Issues**: 19 issues (#13-#31)
**Critical Path**: P0 issues (security) must complete first

### Coordinator Assignments (Example)

**Security Coordinator (Priority)**:
- Issue #13: Remove hardcoded secrets
- Issue #14: Implement HTTPS
- Issue #15: Database encryption
- Issue #17: Multi-factor authentication
- Issue #21: BSP compliance reporting
- Issue #24: Audit trail implementation
- Issue #30: Session timeouts

**Development Coordinator (Priority)**:
- Issue #16: GCash payment integration
- Issue #18: PayMaya integration
- Issue #19: LTFRB compliance
- Issue #26: BIR tax integration
- Issue #28: Passenger profile UX fixes
- Issue #29: Mock data replacement
- Issue #31: WebSocket edge cases

**QA Coordinator (Priority)**:
- Issue #25: End-to-end tests
- Issue #32: Performance regression tests
- Issue #20: Monitoring and alerting (testing component)

**Docs & Git Coordinator (Priority)**:
- Issue #22: Backup and disaster recovery docs
- Issue #27: API documentation
- All Git workflows for above issues

**Review Coordinator (Priority)**:
- Code review for all completed issues
- Architecture validation for payment integrations
- Security review for authentication changes

**Product & Design Coordinator**:
- Issue #28: Passenger profile UX fixes (design review)
- User flow validation for payment integrations
- Design specs for new features

### Technology Stack Context

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
**Backend**: Next.js API routes, PostgreSQL, Redis
**Real-time**: Socket.io
**Testing**: Jest, Playwright
**Deployment**: Railway/Vercel

Coordinators should be familiar with these technologies and their best practices.

---

## Resources

- [Quickstart Guide](./QUICKSTART.md)
- Individual Coordinator Documentation:
  - [Product & Design Coordinator](./PRODUCT_DESIGN_COORDINATOR.md)
  - [Development Coordinator](./DEVELOPMENT_COORDINATOR.md)
  - [QA Coordinator](./QA_COORDINATOR.md)
  - [Security Coordinator](./SECURITY_COORDINATOR.md)
  - [Docs & Git Coordinator](./DOCS_GIT_COORDINATOR.md)
  - [Review Coordinator](./REVIEW_COORDINATOR.md)

---

## Summary

Domain Coordinators are the execution layer of the Multi-Agent Coordination System. Each coordinator has specific expertise and responsibilities, working together to deliver high-quality software systematically. Success requires clear communication, disciplined processes, and effective collaboration across all coordinators.
