# English writing test · client emails

One candidate report describes writing **three client-facing emails** about hypothetical
support problems, judged on clarity, tone and professionalism. Give yourself **10 minutes per email**.
Write each one in `emails/` (e.g. `emails/01.md`), then ask Claude to review it against the rubric.

## Prompts

1. A customer says their invoices show the wrong VAT rate since this morning's update.
   You have confirmed the bug and a fix will ship tomorrow. Explain the situation and a workaround
   (they can correct the tax on the draft invoice manually).
2. A customer asks for a feature you will not build (exporting every report to their old ERP
   automatically). Say no politely and suggest the CSV export and the API as alternatives.
3. A customer is angry because the website was down for 40 minutes during a sale. You do not know
   the cause yet. Acknowledge the problem, say what you are doing and when they will hear from you.
4. A new customer cannot log in after creating an account. Ask for the information you need
   (email used, screenshot of the error, browser) without sounding like you are blaming them.
5. Follow-up: one week after fixing a stock valuation issue, check that everything is working and
   invite feedback.

## Rubric (score each 1–5)

| Criterion | What good looks like |
|---|---|
| Structure | Greeting, one-line summary, details, next step, sign-off |
| Clarity | Short sentences, one idea per paragraph, no jargon the client won't know |
| Tone | Calm, warm and confident; apologise once when there is a reason, never grovel |
| Action | The client knows exactly what happens next and what (if anything) they must do |
| Accuracy | No promises you can't keep; dates and facts are specific |
| English | Correct grammar and spelling |

## Example answer for prompt 1 (read it only after you've written yours)

> Subject: Wrong VAT rate on invoices – fix coming tomorrow
>
> Dear Ms Laurent,
>
> Thank you for reporting this so quickly. You are right: since this morning's update, new invoices
> use an incorrect VAT rate. We have found the cause and the fix will be released tomorrow, 14 October.
>
> Until then, you can correct the rate yourself: open the draft invoice, change the tax on each line
> to "21% S" and confirm it. Invoices you already confirmed today can be reset to draft and corrected
> the same way.
>
> I will email you as soon as the fix is live. I'm sorry for the extra work this causes.
>
> Kind regards,
> Mohamed
