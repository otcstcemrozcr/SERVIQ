import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def run_smoke_test():
    print("[START] Starting ServiQ Backend Smoke Test...")
    
    # 1. Start OTP Flow
    print("\n[1/8] Starting OTP Flow...")
    res = requests.post(f"{BASE_URL}/serviq/auth/send-otp", json={"email": "smoke_tester@serviq.app"})
    if res.status_code != 200:
        print(f"[ERROR] Failed to send OTP: {res.text}")
        sys.exit(1)
    print("[OK] OTP Sent successfully.")
    
    # 2. Verify OTP (using demo backdoor '123456')
    print("\n[2/8] Verifying OTP...")
    res = requests.post(f"{BASE_URL}/serviq/auth/verify-otp", json={"email": "smoke_tester@serviq.app", "code": "123456"})
    if res.status_code != 200:
        print(f"[ERROR] Failed to verify OTP: {res.text}")
        sys.exit(1)
    
    data = res.json()
    if not data.get("success"):
        print(f"[ERROR] OTP verification failed: {data}")
        sys.exit(1)
        
    api_key = data["api_key"]
    headers = {"Authorization": f"Bearer {api_key}"}
    print("[OK] OTP Verified. API Key obtained.")
    
    # 3. Create a Work Order
    print("\n[3/8] Creating Work Order...")
    payload = {
        "title": "Smoke Test Installation",
        "priority": "HIGH",
        "customer": {
            "name": "Smoke Test Corp",
            "email": "smoke@example.com",
            "phone": "555-0000"
        },
        "equipment": {
            "name": "Smoke Machine 3000",
            "model": "SM-3K",
            "serial_number": "SMK-999"
        }
    }
    res = requests.post(f"{BASE_URL}/serviq/work-orders", json=payload, headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to create work order: {res.text}")
        sys.exit(1)
    wo = res.json()
    wo_id = wo["id"]
    print(f"[OK] Work Order created. ID: {wo_id}, Status: {wo['status']}")
    
    # 4. Start the Work Order
    print("\n[4/8] Starting Work Order...")
    res = requests.post(f"{BASE_URL}/serviq/work-orders/{wo_id}/start", headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to start work order: {res.text}")
        sys.exit(1)
    print("[OK] Work Order started. Status changed to IN_PROGRESS.")
    
    # 5. Add Material
    print("\n[5/8] Adding Material...")
    material_payload = {
        "material_code": "PART-001",
        "material_name": "Test Valve",
        "quantity": 2.0,
        "unit": "PCS",
        "status": "USED",
        "warehouse_location": "Main Storage"
    }
    res = requests.post(f"{BASE_URL}/serviq/work-orders/{wo_id}/materials", json=material_payload, headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to add material: {res.text}")
        sys.exit(1)
    print("[OK] Material added successfully.")
    
    # 6. Add Signature
    print("\n[6/8] Adding Customer Signature...")
    sig_payload = {
        "signer_type": "CUSTOMER",
        "signer_name": "John Doe",
        "image_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }
    res = requests.post(f"{BASE_URL}/serviq/work-orders/{wo_id}/signatures", json=sig_payload, headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to add signature: {res.text}")
        sys.exit(1)
    print("[OK] Signature added successfully.")
    
    # 7. Complete the Work Order
    print("\n[7/8] Completing Work Order...")
    res = requests.post(f"{BASE_URL}/serviq/work-orders/{wo_id}/complete", headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to complete work order: {res.text}")
        sys.exit(1)
    print("[OK] Work Order completed successfully.")
    
    # 8. Trigger ERP Sync
    print("\n[8/8] Triggering ERP Sync...")
    res = requests.post(f"{BASE_URL}/serviq/erp/sync", headers=headers)
    if res.status_code != 200:
        print(f"[ERROR] Failed to sync ERP: {res.text}")
        sys.exit(1)
    sync_res = res.json()
    print(f"[OK] ERP Sync successful. Summary: {sync_res}")
    
    print("\n[SUCCESS] SMOKE TEST PASSED! The core field service pipeline is fully operational.")

if __name__ == "__main__":
    try:
        run_smoke_test()
    except requests.exceptions.ConnectionError:
        print("[ERROR] Could not connect to backend. Make sure the FastAPI server is running on http://localhost:8000")
        sys.exit(1)
