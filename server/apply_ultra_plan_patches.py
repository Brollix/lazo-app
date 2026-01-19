#!/usr/bin/env python3
"""
Ultra Plan Implementation - Automated Patch Script

This script applies all necessary code changes for the Ultra Plan processing pipeline.
Run this from the server directory: python apply_ultra_plan_patches.py
"""

import os
import re

def apply_patch(filepath, find_text, replace_text, description):
    """Apply a single patch to a file"""
    print(f"\n{description}")
    print(f"  File: {filepath}")
    
    if not os.path.exists(filepath):
        print(f"  ❌ File not found!")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if find_text not in content:
        print(f"  ⚠️  Pattern not found - may already be patched or file structure changed!")
        return False
    
    new_content = content.replace(find_text, replace_text)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"  ✅ Patched successfully!")
    return True

def main():
    print("=" * 80)
    print("ULTRA PLAN PROCESSING PIPELINE - AUTOMATED PATCHES")
    print("=" * 80)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_service_path = os.path.join(base_dir, 'src', 'services', 'dbService.ts')
    index_path = os.path.join(base_dir, 'src', 'index.ts')
    
    patches_applied = 0
    patches_failed = 0
    
    # Patch 1: Update updateUserPlan in dbService.ts
    if apply_patch(
        db_service_path,
        '\tcase "ultra":\n\t\tupdates.credits_remaining = 0; // Ultra uses premium credits\n\t\tupdates.premium_credits_remaining = 20;\n\t\tbreak;',
        '\tcase "ultra":\n\t\tupdates.credits_remaining = 100; // Ultra: 100 standard credits\n\t\tupdates.premium_credits_remaining = 20; // Ultra: 20 premium credits\n\t\tupdates.monthly_sessions_used = 0; // Reset session counter\n\t\tupdates.session_month_year = new Date().toISOString().slice(0, 7);\n\t\tbreak;',
        "PATCH 1: Update Ultra plan credit allocation in updateUserPlan"
    ):
        patches_applied += 1
    else:
        patches_failed += 1
    
    # Patch 2: Update renewMonthlyCredits in dbService.ts
    if apply_patch(
        db_service_path,
        '\tif (profile.plan_type === "free") {\n\t\tupdates.credits_remaining = 3;\n\t} else if (profile.plan_type === "ultra") {\n\t\tupdates.premium_credits_remaining = 20;\n\t}\n\t// Pro plan: no renewal needed (unlimited)',
        '\tif (profile.plan_type === "free") {\n\t\tupdates.credits_remaining = 3;\n\t} else if (profile.plan_type === "ultra") {\n\t\tupdates.credits_remaining = 100; // Renew standard credits\n\t\tupdates.premium_credits_remaining = 20; // Renew premium credits\n\t\tupdates.monthly_sessions_used = 0; // Reset session counter\n\t\tupdates.session_month_year = new Date().toISOString().slice(0, 7);\n\t}\n\t// Pro plan: no renewal needed (unlimited)',
        "PATCH 2: Update Ultra plan credit renewal in renewMonthlyCredits"
    ):
        patches_applied += 1
    else:
        patches_failed += 1
    
    # Patch 3: Add Ultra session limit check in index.ts
    if apply_patch(
        index_path,
        '\t\t// Check monthly transcription limit for free users\n\t\tconst monthlyCheck = await checkMonthlyTranscriptionLimit(userId);\n\t\tif (!monthlyCheck.allowed) {\n\t\t\treturn res.status(403).json({\n\t\t\t\tmessage: "monthly_limit_exceeded",\n\t\t\t\tused: monthlyCheck.used,\n\t\t\t\tlimit: monthlyCheck.limit,\n\t\t\t\tmonthYear: monthlyCheck.monthYear,\n\t\t\t});\n\t\t}\n\n\t\t// CREDIT VERIFICATION BASED ON PLAN TYPE',
        '\t\t// Check monthly transcription limit for free users\n\t\tconst monthlyCheck = await checkMonthlyTranscriptionLimit(userId);\n\t\tif (!monthlyCheck.allowed) {\n\t\t\treturn res.status(403).json({\n\t\t\t\tmessage: "monthly_limit_exceeded",\n\t\t\t\tused: monthlyCheck.used,\n\t\t\t\tlimit: monthlyCheck.limit,\n\t\t\t\tmonthYear: monthlyCheck.monthYear,\n\t\t\t});\n\t\t}\n\n\t\t// Check Ultra plan\'s 120 sessions/month hard limit\n\t\tconst ultraCheck = await checkUltraSessionLimit(userId);\n\t\tif (!ultraCheck.allowed) {\n\t\t\treturn res.status(403).json({\n\t\t\t\tmessage: "ultra_monthly_limit_exceeded",\n\t\t\t\tused: ultraCheck.used,\n\t\t\t\tlimit: ultraCheck.limit,\n\t\t\t\tmonthYear: ultraCheck.monthYear,\n\t\t\t});\n\t\t}\n\n\t\t// CREDIT VERIFICATION BASED ON PLAN TYPE',
        "PATCH 3: Add Ultra 120 session limit check"
    ):
        patches_applied += 1
    else:
        patches_failed += 1
    
    # Patch 4: Add Ultra standard credit check
    if apply_patch(
        index_path,
        '\t\t// Ultra plan with high precision: check premium credits\n\t\tif (profile.plan_type === "ultra" && useHighPrecision) {\n\t\t\tif (profile.premium_credits_remaining <= 0) {\n\t\t\t\treturn res.status(403).json({\n\t\t\t\t\tmessage:\n\t\t\t\t\t\t"Créditos premium agotados. Usa modo estándar o espera la renovación mensual.",\n\t\t\t\t\tupgradeRequired: false,\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\n\t\t// Additional validation: High Precision only for Ultra users',
        '\t\t// Ultra plan with high precision: check premium credits\n\t\tif (profile.plan_type === "ultra" && useHighPrecision) {\n\t\t\tif (profile.premium_credits_remaining <= 0) {\n\t\t\t\treturn res.status(403).json({\n\t\t\t\t\tmessage:\n\t\t\t\t\t\t"Créditos premium agotados. Usa modo estándar o espera la renovación mensual.",\n\t\t\t\t\tupgradeRequired: false,\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\n\t\t// Ultra plan with standard mode: check standard credits\n\t\tif (profile.plan_type === "ultra" && !useHighPrecision) {\n\t\t\tif (profile.credits_remaining <= 0) {\n\t\t\t\treturn res.status(403).json({\n\t\t\t\t\tmessage:\n\t\t\t\t\t\t"Créditos estándar agotados. Espera la renovación mensual o contacta al soporte.",\n\t\t\t\t\tupgradeRequired: false,\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\n\t\t// Additional validation: High Precision only for Ultra users',
        "PATCH 4: Add Ultra standard credit validation"
    ):
        patches_applied += 1
    else:
        patches_failed += 1
    
    print("\n" + "=" * 80)
    print(f"PATCH SUMMARY:")
    print(f"  ✅ Applied: {patches_applied}")
    print(f"  ❌ Failed: {patches_failed}")
    print("=" * 80)
    
    if patches_failed > 0:
        print("\n⚠️  Some patches failed. Please review the manual changes file.")
        print("   File: server/MANUAL_CHANGES_ULTRA_PLAN.ts")
    else:
        print("\n✅ All patches applied successfully!")
        print("\nNEXT STEPS:")
        print("1. Run: npm run build --workspace=server")
        print("2. Apply database migration")
        print("3. Review changes and test thoroughly")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()
