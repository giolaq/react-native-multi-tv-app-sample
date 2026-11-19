import unittest
from pathlib import Path

from check_pr_evidence import evidence_errors


REPORT = """Closes #8
## Intent
Fix jumping backwards when Fast Forward is pressed.
## Acceptance
At 60 seconds, pressing Fast Forward should seek to 70. The old player sought to zero.
## Verification
`yarn test:all` passed 59 tests. Android TV remote advanced and rewound the paused clip.
## Risk and review
Risk: yellow
Review: AI-3
Custom player controls affect Expo playback.
## Limitations
The Vega package could not be installed with the local SDK.
"""


class EvidenceTests(unittest.TestCase):
    def test_accepts_report(self):
        self.assertEqual(evidence_errors(REPORT), [])

    def test_empty_and_template_are_incomplete(self):
        template = Path(__file__).resolve().parents[1] / 'PULL_REQUEST_TEMPLATE.md'
        for body in ('', template.read_text()):
            with self.subTest(body=body):
                self.assertTrue(evidence_errors(body))

    def test_template_hints_do_not_substitute_for_verification(self):
        body = REPORT.replace(REPORT.split('## Verification\n')[1].split('\n##')[0],
                              '<!-- Test this on a device -->')
        self.assertIn('Complete Verification.', evidence_errors(body))

    def test_review_matches_impact(self):
        self.assertTrue(evidence_errors(REPORT.replace('yellow', 'red')))
        self.assertFalse(evidence_errors(REPORT.replace('yellow', 'red').replace('AI-3', 'human')))
        self.assertTrue(evidence_errors(REPORT.replace('AI-3', 'AI-1')))

    def test_requires_an_unambiguous_classification_and_reason(self):
        self.assertTrue(evidence_errors(REPORT.replace('Risk: yellow', 'Risk: yellow\nRisk: green')))
        self.assertTrue(evidence_errors(REPORT.replace('Custom player controls affect Expo playback.', '')))


if __name__ == '__main__':
    unittest.main()
