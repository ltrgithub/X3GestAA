alter table BPCUSTOMER drop column uuid
alter table BPCUSTOMER add uuid CHAR(32)
update BPCUSTOMER set uuid=SYS_GUID()
alter table BPCUSTOMER modify uuid not null
