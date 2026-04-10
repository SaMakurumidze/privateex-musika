# PrivateEx ERD (Current Platform)

```mermaid
erDiagram
    investors {
        int id PK
        string full_name
        string email
        string password
        string role
        string id_passport
        string phone
        string country
        string address
        boolean is_locked
        boolean force_password_change
        datetime created_at
        datetime updated_at
    }

    users {
        int id PK
        string name
        string email
        string password
        string role
        datetime created_at
    }

    wallets {
        int id PK
        int investor_id FK
        decimal balance
        datetime created_at
        datetime updated_at
    }

    companies {
        int id PK
        string company_id UK
        string company_name
        decimal price_per_share
        decimal available_shares
        decimal total_shares
        string status
        string listing_status
        string sector
        datetime created_at
        datetime updated_at
    }

    directors {
        int id PK
        string full_name
        string email
        string phone
        string position
        string company_id FK
        datetime created_at
    }

    portfolio {
        int id PK
        int user_id FK
        string transaction_id UK
        string company_id FK
        string company_name
        decimal shares_purchased
        decimal price_per_share
        string payment_method
        string status
        datetime purchase_date
    }

    certificates {
        int id PK
        string certificate_number UK
        string transaction_id FK
        int investor_id FK
        string shareholder_name
        string shareholder_id_passport
        string company_id
        string company_name
        decimal shares_issued
        decimal price_per_share
        decimal total_amount
        datetime issued_at
    }

    investor_messages {
        int id PK
        int investor_id FK
        string subject
        text body
        boolean is_read
        datetime created_at
    }

    conversation_messages {
        int id PK
        int investor_id FK
        string sender_type
        int admin_user_id FK
        string subject
        text body
        datetime read_by_investor_at
        datetime read_by_admin_at
        datetime created_at
    }

    purchase_charge_audit {
        int id PK
        string transaction_id UK
        int investor_id FK
        string investor_name
        string investor_email
        string company_id
        string company_name
        decimal shares_purchased
        decimal price_per_share
        decimal subtotal
        decimal service_fee
        decimal tax
        decimal total_amount
        string payment_method
        datetime charged_at
    }

    activity_audit_logs {
        bigint id PK
        string actor_type
        int actor_id
        string actor_name
        string actor_email
        string actor_role
        string event_type
        string page_path
        string feature_name
        int duration_seconds
        json interaction_meta
        string ip_address
        string user_agent
        string browser_name
        string browser_version
        string os_name
        string device_type
        datetime created_at
    }

    investors ||--o{ wallets : "has wallet(s)"
    investors ||--o{ portfolio : "makes purchases"
    companies ||--o{ portfolio : "is purchased"
    investors ||--o{ certificates : "owns certificates"
    portfolio ||--o| certificates : "may issue certificate"
    companies ||--o{ directors : "has directors"
    investors ||--o{ investor_messages : "receives announcements"
    investors ||--o{ conversation_messages : "has threads"
    users ||--o{ conversation_messages : "admin replies"
    investors ||--o{ purchase_charge_audit : "generates charge audit"
```

## Notes

- This ERD reflects the **current implementation** in code.
- Some tables are created in code (`conversation_messages`, `investor_messages`, `purchase_charge_audit`, `activity_audit_logs`), while others are pre-existing but actively queried/updated.
- `activity_audit_logs.actor_id` is polymorphic (`investors.id` or `users.id`) depending on `actor_type`.

