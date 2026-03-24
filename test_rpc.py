import urllib.request, json

def rpc(m, p):
    r = urllib.request.Request('http://127.0.0.1:9850', method='POST',
        headers={'Content-Type':'application/json'},
        data=json.dumps({'jsonrpc':'2.0','method':m,'params':p,'id':1}).encode())
    return json.loads(urllib.request.urlopen(r).read())

addr = '0x05744314501c42a31c6a5781d5886ef9'

# Test state2.get_resource for account check
print("=== state2.get_resource (account check) ===")
try:
    r = rpc('state2.get_resource', [addr, '0x00000000000000000000000000000001::account::Account'])
    print("Result:", json.dumps(r.get('result'), indent=2)[:500] if r.get('result') else "None/null")
except Exception as e:
    print("Error:", e)

print()

# Test state2.list_resource with primary_fungible_store
print("=== state2.list_resource (with primary_fungible_store) ===")
try:
    r = rpc('state2.list_resource', [addr, {'decode': True, 'primary_fungible_store': {'token_code': '0x1::starcoin_coin::STC'}}])
    resources = r.get('result', {}).get('resources', {})
    print(f"Number of resources: {len(resources)}")
    for k in resources:
        val_str = json.dumps(resources[k], indent=2)
        print(f"\nKEY: {k}")
        print(f"VALUE: {val_str[:500]}")
except Exception as e:
    print("Error:", e)

print()

# Test state2.list_resource without primary_fungible_store
print("=== state2.list_resource (without primary_fungible_store) ===")
try:
    r = rpc('state2.list_resource', [addr, {'decode': True}])
    resources = r.get('result', {}).get('resources', {})
    print(f"Number of resources: {len(resources)}")
    for k in resources:
        val_str = json.dumps(resources[k], indent=2)
        print(f"\nKEY: {k}")
        print(f"VALUE: {val_str[:500]}")
except Exception as e:
    print("Error:", e)
