# MIHAKK

MIHAKK is a no-login, static exam practice site for Helwan International Technological University students. Pick a subject and question type, answer at your own pace, and review your score and explanations.

## Run locally

Open the project through any static web server (for example, VS Code Live Server). The browser fetches the question JSON files from `Sub/`, so opening `index.html` directly as a `file://` URL is not supported.

## Publish with GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`. The site is static and needs no build step, database, API keys, or student accounts.

Question files in `Sub/` follow the existing JSON format. `mcq` and `true_false` questions are auto-graded; essay responses are shown with their model answers for self-review.
