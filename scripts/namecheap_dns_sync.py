#!/usr/bin/env python3
import argparse
import os
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from copy import deepcopy

API_URL = "https://api.namecheap.com/xml.response"
NS = {"nc": "http://api.namecheap.com/xml.response"}


def api_call(params):
    query = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{API_URL}?{query}") as response:
        payload = response.read()
    root = ET.fromstring(payload)
    status = root.attrib.get("Status")
    if status != "OK":
        errors = [e.text for e in root.findall(".//nc:Errors/nc:Error", NS)]
        if not errors:
            errors = [e.text for e in root.findall(".//Errors/Error")]
        raise RuntimeError("Namecheap API error: " + " | ".join(errors or ["Unknown error"]))
    return root


def parse_hosts(root):
    hosts = []
    for h in root.findall(".//nc:CommandResponse/nc:DomainDNSGetHostsResult/nc:host", NS):
        hosts.append(
            {
                "Name": h.attrib.get("Name", ""),
                "Type": h.attrib.get("Type", ""),
                "Address": h.attrib.get("Address", ""),
                "TTL": h.attrib.get("TTL", "1800"),
                "MXPref": h.attrib.get("MXPref", "10"),
            }
        )
    if not hosts:
        for h in root.findall(".//CommandResponse/DomainDNSGetHostsResult/host"):
            hosts.append(
                {
                    "Name": h.attrib.get("Name", ""),
                    "Type": h.attrib.get("Type", ""),
                    "Address": h.attrib.get("Address", ""),
                    "TTL": h.attrib.get("TTL", "1800"),
                    "MXPref": h.attrib.get("MXPref", "10"),
                }
            )
    return hosts


def upsert(records, name, rtype, address, ttl="1800", mxpref="10"):
    updated = False
    for rec in records:
        if rec["Name"] == name and rec["Type"] == rtype:
            rec["Address"] = address
            rec["TTL"] = ttl
            rec["MXPref"] = mxpref
            updated = True
    if not updated:
        records.append(
            {
                "Name": name,
                "Type": rtype,
                "Address": address,
                "TTL": ttl,
                "MXPref": mxpref,
            }
        )


def remove(records, name, rtype):
    return [r for r in records if not (r["Name"] == name and r["Type"] == rtype)]


def build_sethosts_params(base, sld, tld, records):
    params = deepcopy(base)
    params.update(
        {
            "Command": "namecheap.domains.dns.setHosts",
            "SLD": sld,
            "TLD": tld,
        }
    )
    for i, rec in enumerate(records, start=1):
        params[f"HostName{i}"] = rec["Name"]
        params[f"RecordType{i}"] = rec["Type"]
        params[f"Address{i}"] = rec["Address"]
        params[f"TTL{i}"] = rec["TTL"]
        params[f"MXPref{i}"] = rec["MXPref"]
    return params


def main():
    parser = argparse.ArgumentParser(description="Sync Namecheap DNS for Azure App Service domain mapping")
    parser.add_argument("--domain", required=True, help="Base domain, e.g. berlin-marketing.me")
    parser.add_argument("--azure-host", required=True, help="Azure host, e.g. agency-crm-backend-bm.azurewebsites.net")
    parser.add_argument("--azure-ip", required=True, help="Azure external IP for apex A record")
    parser.add_argument("--verification-id", required=True, help="Azure customDomainVerificationId")
    parser.add_argument("--include-api-subdomain", action="store_true", help="Also create api CNAME + asuid.api TXT")
    parser.add_argument("--dry-run", action="store_true", help="Show intended records without applying")
    args = parser.parse_args()

    api_user = os.getenv("NAMECHEAP_API_USER")
    api_key = os.getenv("NAMECHEAP_API_KEY")
    username = os.getenv("NAMECHEAP_USERNAME") or api_user
    client_ip = os.getenv("NAMECHEAP_CLIENT_IP")

    missing = [
        key
        for key, value in {
            "NAMECHEAP_API_USER": api_user,
            "NAMECHEAP_API_KEY": api_key,
            "NAMECHEAP_USERNAME": username,
            "NAMECHEAP_CLIENT_IP": client_ip,
        }.items()
        if not value
    ]
    if missing:
        print("Missing env vars:", ", ".join(missing), file=sys.stderr)
        sys.exit(2)

    parts = args.domain.split(".")
    if len(parts) < 2:
        print("Invalid domain", file=sys.stderr)
        sys.exit(2)
    sld = parts[-2]
    tld = parts[-1]

    base = {
        "ApiUser": api_user,
        "ApiKey": api_key,
        "UserName": username,
        "ClientIp": client_ip,
    }

    get_params = dict(base)
    get_params.update(
        {
            "Command": "namecheap.domains.dns.getHosts",
            "SLD": sld,
            "TLD": tld,
        }
    )
    root = api_call(get_params)
    records = parse_hosts(root)

    # Ensure Azure apex mapping + verification for root domain
    upsert(records, "@", "A", args.azure_ip)
    upsert(records, "www", "CNAME", args.azure_host)
    upsert(records, "asuid", "TXT", args.verification_id.lower())

    if args.include_api_subdomain:
        upsert(records, "api", "CNAME", args.azure_host)
        upsert(records, "asuid.api", "TXT", args.verification_id.lower())
    else:
        records = remove(records, "api", "CNAME")
        records = remove(records, "asuid.api", "TXT")

    if args.dry_run:
        print("Planned records:")
        for rec in records:
            print(f"- {rec['Name']} {rec['Type']} {rec['Address']} TTL={rec['TTL']}")
        return

    set_params = build_sethosts_params(base, sld, tld, records)
    api_call(set_params)
    print("Namecheap DNS updated successfully.")


if __name__ == "__main__":
    main()
