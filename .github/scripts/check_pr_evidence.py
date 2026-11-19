"""Check the structure of the PR handoff. CI and reviewers verify its claims."""

import json
import os
import re
import sys
from pathlib import Path

SECTIONS = ('Intent', 'Acceptance', 'Verification', 'Risk and review', 'Limitations')
REVIEWS = {
    'green': {'ai-1', 'ai-2', 'ai-3', 'human'},
    'yellow': {'ai-2', 'ai-3', 'human'},
    'red': {'human'},
}


def has_response(text):
    return bool(re.search(r'\w', text)) and text.strip().lower() not in {'tbd', 'todo', 'n/a'}


def evidence_errors(body):
    visible = re.sub(r'<!--.*?(?:-->|\Z)', '', body or '', flags=re.S)
    parts = re.split(r'^##[ \t]+([^\n]+)$', visible, flags=re.M)
    sections = {heading.strip().lower(): content.strip()
                for heading, content in zip(parts[1::2], parts[2::2])}
    errors = [f'Complete {title}.' for title in SECTIONS
              if not has_response(sections.get(title.lower(), ''))]
    risk_section = sections.get('risk and review', '')
    risk = re.findall(r'^risk:[ \t]*(.*)$', risk_section, re.I | re.M)
    review = re.findall(r'^review:[ \t]*(.*)$', risk_section, re.I | re.M)
    if len(risk) != 1 or risk[0].strip().lower() not in REVIEWS:
        errors.append('Specify one Risk: green, yellow, or red.')
    elif len(review) != 1 or review[0].strip().lower() not in REVIEWS[risk[0].strip().lower()]:
        errors.append('Specify one Review level allowed for this risk (red requires human).')
    rationale = re.sub(r'^(?:risk|review):.*$', '', risk_section, flags=re.I | re.M)
    if not has_response(rationale):
        errors.append('Explain the blast radius in Risk and review.')
    return errors


if __name__ == '__main__':
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    problems = evidence_errors(event['pull_request']['body'])
    if problems:
        sys.exit('\n'.join(problems))
    print('PR handoff fields are complete.')
