# Map Hunt Development Rules

These instructions apply to every Codex task in the Map Hunt repository. Map Hunt is an educational geography game for secondary-school students, so development must prioritize geographical accuracy, intuitive gameplay, mobile accessibility, security, privacy, and maintainable code.

## 1. Before Editing

- Briefly state the task goal, proposed changes, and verification approach before editing.
- Use a separate Git branch for each independent task so changes can be reviewed before they go live.
- Keep modifications focused on the requested work.
- Review the relevant code and project documentation before making changes.
- Identify dependencies, related features, and potential conflicts.
- Avoid modifying unrelated files. Explain any necessary additional change before making it.

## 2. Code Quality

- Write clean, readable, modular, and maintainable code.
- Follow the existing project structure and conventions.
- Prefer simple solutions over unnecessary complexity.
- Avoid unnecessary dependencies, duplication, and major refactoring.
- Preserve existing working functionality unless the task explicitly requires a change.
- Use descriptive names and remove unused code only when it is safe.
- Explain significant technical or architectural decisions in plain English.

## 3. Mobile and Desktop Compatibility

- Treat mobile devices as a primary gameplay platform.
- Ensure interactive tools and controls support touch input.
- Preserve mouse and keyboard support on desktop.
- Use responsive layouts and avoid hover-only interactions.
- Keep buttons, text, instructions, and controls accessible on small screens.
- Prevent overlapping controls and unwanted horizontal scrolling.
- Test affected interfaces at phone and desktop widths.

## 4. Educational Accuracy and User Experience

- Maintain accurate geography terminology, calculations, measurements, and explanations.
- Use clear, concise language suitable for secondary-school students.
- Make gameplay and geography tools intuitive.
- Design hints to become progressively more specific and help students learn rather than reveal answers immediately.
- Provide useful, understandable feedback when students make mistakes.
- Preserve the educational purpose of existing gameplay.
- Do not compromise geographical accuracy for visual design.

## 5. Security and Privacy

- Follow secure coding practices.
- Never expose passwords, private credentials, API secrets, or other sensitive information.
- Validate and safely handle user input where applicable.
- Avoid unnecessary collection, transmission, or storage of personal information.
- Review external services and dependencies before introducing them, and explain their purpose.
- Identify and report potential vulnerabilities.
- Verify security fixes before claiming that an issue is resolved.

## 6. Parallel Codex Development

- Use separate branches for independent tasks.
- Do not overwrite, remove, or reformat unrelated work.
- Do not assume changes from another Codex session or branch are present in the current branch.
- Check the target branch for relevant changes before preparing a pull request.
- Identify possible merge conflicts and dependencies between tasks.
- Preserve work completed on other branches.
- Do not automatically merge branches or push directly to the production branch.
- Prepare changes through GitHub pull requests. The project owner approves merges, releases, and publication.

## 7. Testing

- Run the relevant automated tests after making changes.
- Fix failures introduced by the task and rerun the affected tests.
- If no automated test covers the changed behavior, verify it in the browser when possible.
- Test affected gameplay interfaces at phone and desktop widths.
- Check that significant modifications do not break existing gameplay.
- Never claim a test passed unless it was actually executed.
- Report passed, failed, and untested checks separately.
- Give the project owner exact manual verification steps when necessary.

## 8. Documentation Maintenance

Keep the following files synchronized with the actual repository:

- **README.md:** Explain the application, verified user-facing features, controls, setup, local development, and deployment. Update it when user-facing behavior or setup changes.
- **CHANGELOG.md:** Record meaningful, verified features, improvements, fixes, and security changes. Maintain an Unreleased section and use Git history for historical entries.
- **ROADMAP.md:** Track planned, in-progress, and completed improvements. Update task status when development progresses.

Documentation rules:

- Clearly distinguish planned, in-progress, completed, merged, and released work.
- Do not invent historical changes, versions, dates, test results, or completed features.
- Do not claim changes on another branch are merged or released.
- Mark work complete only after the relevant implementation has been verified.
- Include relevant documentation updates in the same pull request as a feature whenever practical.
- Avoid unnecessary documentation updates for minor internal changes.

## 9. Pull Requests and Task Reporting

At the end of every development task:

1. Summarize what changed and why.
2. List every file created or modified.
3. Report the tests performed and their results.
4. Identify remaining issues, limitations, risks, and checks that could not be performed.
5. Update relevant documentation.
6. Prepare a GitHub pull request for review.
7. Provide exact manual verification steps when needed.

Do not merge, deploy, publish, or release changes without explicit approval from the project owner.

## 10. Communication

- Use clear, direct, and concise English.
- Explain technical decisions in terms a developer with limited experience can understand.
- Avoid unnecessary jargon.
- Explain why a new dependency, tool, service, or architectural change is needed.
- Highlight important risks and trade-offs before major changes.
- Ask for clarification when an ambiguous requirement could significantly affect gameplay or existing functionality.
- Do not implement unrelated improvements without authorization.

## 11. Core Principle

Every change should improve at least one of these areas: educational value, gameplay experience, accessibility and mobile usability, performance and reliability, security and privacy, or code quality and maintainability.

Prefer incremental, verified improvements over unnecessary rewrites. Preserve working functionality and keep documentation aligned with the repository.
