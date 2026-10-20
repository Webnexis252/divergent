# AWS Lambda container image for the nightly question analysis.
# A container rather than a zip because pandas + numpy are too big for a
# comfortable zip deployment. Build for the architecture in
# infra/aws/question-analytics.yaml (arm64); see README.md.
FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY question_analytics ${LAMBDA_TASK_ROOT}/question_analytics

CMD ["question_analytics.handler.handler"]
