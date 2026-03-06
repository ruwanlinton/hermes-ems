"""Stage 5: Grading — compare detected answers against answer key."""
from typing import Optional


def grade_type1(
    detected_option: Optional[str],
    correct_option: str,
) -> float:
    """Type 1: 1 point if correct, 0 otherwise."""
    if detected_option is None:
        return 0.0
    return 1.0 if detected_option.upper() == correct_option.upper() else 0.0


def grade_type2(
    detected_answers: dict[str, bool],
    correct_sub_options: dict[str, bool],
) -> float:
    """
    Type 2: 0.2 points per correct sub-option (A-E), max 1.0 per question.
    Sub-options not in detected_answers are treated as False.
    """
    score = 0.0
    for opt, correct_val in correct_sub_options.items():
        detected_val = detected_answers.get(opt, False)
        if detected_val == correct_val:
            score += 0.2
    return round(min(score, 1.0), 4)


def grade_submission(
    raw_answers: dict,
    answer_keys: list[dict],
    questions: list[dict],
) -> tuple[float, dict]:
    """
    Grade a submission against the answer key.

    Args:
        raw_answers: {"type1": {q_num: option}, "type2": {q_num: {A: bool, ...}}}
        answer_keys: list of AnswerKey dicts with question_number, question_type,
                     correct_option, sub_options
        questions: list of Question dicts with question_number, question_type

    Returns:
        (total_score, question_scores dict)
    """
    # Build lookup by question_number → answer_key
    ak_by_qnum = {}
    for ak in answer_keys:
        ak_by_qnum[str(ak["question_number"])] = ak

    type1_answers = raw_answers.get("type1", {})
    type2_answers = raw_answers.get("type2", {})

    question_scores = {}
    total_score = 0.0

    for q in questions:
        q_num = str(q["question_number"])
        q_type = q["question_type"]
        ak = ak_by_qnum.get(q_num)

        if ak is None:
            # No answer key for this question — skip
            question_scores[q_num] = 0.0
            continue

        if q_type == "type1":
            detected = type1_answers.get(q_num)
            correct = ak.get("correct_option")
            if correct:
                score = grade_type1(detected, correct)
            else:
                score = 0.0
        elif q_type == "type2":
            detected = type2_answers.get(q_num, {})
            correct_sub = ak.get("sub_options", {})
            if correct_sub:
                score = grade_type2(detected, correct_sub)
            else:
                score = 0.0
        else:
            score = 0.0

        question_scores[q_num] = score
        total_score += score

    return round(total_score, 4), question_scores
