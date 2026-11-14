# Map Hunt development rules

## Before editing

- State the goal, what you plan to change, and how you will check that it works. Keep this brief and use plain English.
- Use a separate Git branch for each task so the changes can be reviewed before they go live.
- Keep each change focused on the requested task.

## Test every change

- Run the relevant automated tests after editing.
- If a test fails because of your change, fix the problem and rerun the test.
- If there is no automated test for the behavior you changed, verify it in the browser when possible.
- For changes to the game interface, check the affected part of the game at both phone and desktop widths.
- Report what passed, what failed, and what you could not check. Give me exact steps for any checks I need to do myself.

## Prepare changes for review

- Summarize what changed and why. List the files you changed and the checks you ran.
- Prepare the change for a GitHub pull request. I decide when to merge it and publish it.
