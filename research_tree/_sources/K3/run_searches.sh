#!/bin/bash
# Sequential arXiv searches with pacing to avoid rate limits
QUERIES=(
  'all:%22attributable%20generation%22'
  'all:%22citation%22%20AND%20all:%22grounding%22'
  'all:%22retrieve%20then%20verify%22'
  'all:%22hallucination%20detection%22%20AND%20all:%22factual%22'
  'all:%22fact%20checking%22%20AND%20cat:cs.CL'
  'all:%22provenance%22%20AND%20all:%22LLM%22'
)
NAMES=(attributable_generation citation_grounding retrieve_then_verify hallucination_detection fact_checking provenance)
for i in "${!QUERIES[@]}"; do
  f="arxiv_${NAMES[$i]}.xml"
  echo "=== $f : ${QUERIES[$i]}"
  curl -sL --max-time 40 "https://export.arxiv.org/api/query?search_query=${QUERIES[$i]}&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending" -o "$f"
  echo "bytes: $(wc -c < "$f")"
  sleep 4
done
echo DONE
