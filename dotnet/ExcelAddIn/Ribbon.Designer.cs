namespace ExcelAddIn
{
    partial class Ribbon : Microsoft.Office.Tools.Ribbon.OfficeRibbon
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        public Ribbon()
        {
            InitializeComponent();
        }

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem1 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem2 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem3 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem4 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem5 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem6 = new Microsoft.Office.Tools.Ribbon.RibbonDropDownItem();
            this.syracuseTab = new Microsoft.Office.Tools.Ribbon.RibbonTab();
            this.group1 = new Microsoft.Office.Tools.Ribbon.RibbonGroup();
            this.buttonConnect = new Microsoft.Office.Tools.Ribbon.RibbonButton();
            this.buttonServer = new Microsoft.Office.Tools.Ribbon.RibbonButton();
            this.group2 = new Microsoft.Office.Tools.Ribbon.RibbonGroup();
            this.buttonSettings = new Microsoft.Office.Tools.Ribbon.RibbonButton();
            this.buttonRefreshAll = new Microsoft.Office.Tools.Ribbon.RibbonButton();
            this.group3 = new Microsoft.Office.Tools.Ribbon.RibbonGroup();
            this.buttonPublish = new Microsoft.Office.Tools.Ribbon.RibbonButton();
            this.groupSageX3 = new Microsoft.Office.Tools.Ribbon.RibbonGroup();
            this.checkBox1 = new Microsoft.Office.Tools.Ribbon.RibbonCheckBox();
            this.dropDownInsert = new Microsoft.Office.Tools.Ribbon.RibbonDropDown();
            this.dropDownDelete = new Microsoft.Office.Tools.Ribbon.RibbonDropDown();
            this.menu1 = new Microsoft.Office.Tools.Ribbon.RibbonMenu();
            this.syracuseTab.SuspendLayout();
            this.group1.SuspendLayout();
            this.group2.SuspendLayout();
            this.group3.SuspendLayout();
            this.groupSageX3.SuspendLayout();
            this.SuspendLayout();
            // 
            // syracuseTab
            // 
            this.syracuseTab.ControlId.ControlIdType = Microsoft.Office.Tools.Ribbon.RibbonControlIdType.Office;
            this.syracuseTab.Groups.Add(this.group1);
            this.syracuseTab.Groups.Add(this.group2);
            this.syracuseTab.Groups.Add(this.group3);
            this.syracuseTab.Groups.Add(this.groupSageX3);
            this.syracuseTab.Label = "Sage Syracuse";
            this.syracuseTab.Name = "syracuseTab";
            // 
            // group1
            // 
            this.group1.Items.Add(this.buttonConnect);
            this.group1.Items.Add(this.buttonServer);
            this.group1.Label = "Sage ERP X3";
            this.group1.Name = "group1";
            // 
            // buttonConnect
            // 
            this.buttonConnect.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonConnect.Description = "Connect to Sage ERP X3 Server";
            this.buttonConnect.Image = global::ExcelAddIn.Properties.Resources.connect;
            this.buttonConnect.Label = "Connect";
            this.buttonConnect.Name = "buttonConnect";
            this.buttonConnect.ShowImage = true;
            this.buttonConnect.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.buttonConnect_Click);
            // 
            // buttonServer
            // 
            this.buttonServer.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonServer.Image = global::ExcelAddIn.Properties.Resources.server_settings;
            this.buttonServer.Label = "Server settings";
            this.buttonServer.Name = "buttonServer";
            this.buttonServer.ShowImage = true;
            this.buttonServer.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.buttonServer_Click);
            // 
            // group2
            // 
            this.group2.Items.Add(this.buttonSettings);
            this.group2.Items.Add(this.buttonRefreshAll);
            this.group2.Label = "Data";
            this.group2.Name = "group2";
            // 
            // buttonSettings
            // 
            this.buttonSettings.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonSettings.Image = global::ExcelAddIn.Properties.Resources.settings;
            this.buttonSettings.Label = "Settings";
            this.buttonSettings.Name = "buttonSettings";
            this.buttonSettings.ShowImage = true;
            this.buttonSettings.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.buttonSettings_Click);
            // 
            // buttonRefreshAll
            // 
            this.buttonRefreshAll.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonRefreshAll.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.buttonRefreshAll.Label = "Refresh All";
            this.buttonRefreshAll.Name = "buttonRefreshAll";
            this.buttonRefreshAll.ShowImage = true;
            this.buttonRefreshAll.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.buttonRefreshAll_Click);
            // 
            // group3
            // 
            this.group3.Items.Add(this.buttonPublish);
            this.group3.Label = "Document";
            this.group3.Name = "group3";
            // 
            // buttonPublish
            // 
            this.buttonPublish.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            this.buttonPublish.Image = global::ExcelAddIn.Properties.Resources.save;
            this.buttonPublish.Label = "Save to X3";
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.buttonPublish_Click);
            // 
            // groupSageX3
            // 
            this.groupSageX3.Items.Add(this.checkBox1);
            this.groupSageX3.Items.Add(this.dropDownInsert);
            this.groupSageX3.Items.Add(this.dropDownDelete);
            this.groupSageX3.Label = "Options";
            this.groupSageX3.Name = "groupSageX3";
            // 
            // checkBox1
            // 
            this.checkBox1.Label = "Show action panel";
            this.checkBox1.Name = "checkBox1";
            this.checkBox1.Click += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonControlEventArgs>(this.checkBox1_Click);
            // 
            // dropDownInsert
            // 
            ribbonDropDownItem1.Label = "Shift cells down";
            ribbonDropDownItem2.Label = "Insert rows";
            ribbonDropDownItem3.Label = "Do nothing";
            this.dropDownInsert.Items.Add(ribbonDropDownItem1);
            this.dropDownInsert.Items.Add(ribbonDropDownItem2);
            this.dropDownInsert.Items.Add(ribbonDropDownItem3);
            this.dropDownInsert.Label = "On table grow";
            this.dropDownInsert.Name = "dropDownInsert";
            // 
            // dropDownDelete
            // 
            ribbonDropDownItem4.Label = "Delete cells";
            ribbonDropDownItem5.Label = "Delete rows";
            ribbonDropDownItem6.Label = "Do nothing";
            this.dropDownDelete.Items.Add(ribbonDropDownItem4);
            this.dropDownDelete.Items.Add(ribbonDropDownItem5);
            this.dropDownDelete.Items.Add(ribbonDropDownItem6);
            this.dropDownDelete.Label = "On table shrink";
            this.dropDownDelete.Name = "dropDownDelete";
            // 
            // menu1
            // 
            this.menu1.Label = "menu1";
            this.menu1.Name = "menu1";
            this.menu1.ShowImage = true;
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            // 
            // Ribbon.OfficeMenu
            // 
            this.OfficeMenu.Items.Add(this.menu1);
            this.RibbonType = "Microsoft.Excel.Workbook";
            this.Tabs.Add(this.syracuseTab);
            this.Load += new System.EventHandler<Microsoft.Office.Tools.Ribbon.RibbonUIEventArgs>(this.Ribbon_Load);
            this.syracuseTab.ResumeLayout(false);
            this.syracuseTab.PerformLayout();
            this.group1.ResumeLayout(false);
            this.group1.PerformLayout();
            this.group2.ResumeLayout(false);
            this.group2.PerformLayout();
            this.group3.ResumeLayout(false);
            this.group3.PerformLayout();
            this.groupSageX3.ResumeLayout(false);
            this.groupSageX3.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        internal Microsoft.Office.Tools.Ribbon.RibbonTab syracuseTab;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup groupSageX3;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group1;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonConnect;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group2;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonSettings;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonServer;
        internal Microsoft.Office.Tools.Ribbon.RibbonGroup group3;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonPublish;
        internal Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownDelete;
        internal Microsoft.Office.Tools.Ribbon.RibbonMenu menu1;
        internal Microsoft.Office.Tools.Ribbon.RibbonButton buttonRefreshAll;
        internal Microsoft.Office.Tools.Ribbon.RibbonCheckBox checkBox1;
        public Microsoft.Office.Tools.Ribbon.RibbonDropDown dropDownInsert;
    }

    partial class ThisRibbonCollection : Microsoft.Office.Tools.Ribbon.RibbonReadOnlyCollection
    {
        internal Ribbon Ribbon
        {
            get { return this.GetRibbon<Ribbon>(); }
        }
    }
}
