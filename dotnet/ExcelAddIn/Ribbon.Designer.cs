using System.Threading;
using System.Globalization;
namespace ExcelAddIn
{
    partial class Ribbon : Microsoft.Office.Tools.Ribbon.RibbonBase
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        public Ribbon()
            : base(Globals.Factory.GetRibbonFactory())
        {
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InstalledUICulture;
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
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Ribbon));
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem1 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem2 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem3 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem4 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem5 = this.Factory.CreateRibbonDropDownItem();
            Microsoft.Office.Tools.Ribbon.RibbonDropDownItem ribbonDropDownItem6 = this.Factory.CreateRibbonDropDownItem();
            this.syracuseTab = this.Factory.CreateRibbonTab();
            this.group1 = this.Factory.CreateRibbonGroup();
            this.buttonConnect = this.Factory.CreateRibbonButton();
            this.buttonServer = this.Factory.CreateRibbonButton();
            this.group2 = this.Factory.CreateRibbonGroup();
            this.buttonSettings = this.Factory.CreateRibbonButton();
            this.buttonRefreshAll = this.Factory.CreateRibbonButton();
            this.group3 = this.Factory.CreateRibbonGroup();
            this.buttonPublish = this.Factory.CreateRibbonButton();
            this.groupSageX3 = this.Factory.CreateRibbonGroup();
            this.checkBox1 = this.Factory.CreateRibbonCheckBox();
            this.dropDownInsert = this.Factory.CreateRibbonDropDown();
            this.dropDownDelete = this.Factory.CreateRibbonDropDown();
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
            resources.ApplyResources(this.syracuseTab, "syracuseTab");
            this.syracuseTab.Name = "syracuseTab";
            // 
            // group1
            // 
            this.group1.Items.Add(this.buttonConnect);
            this.group1.Items.Add(this.buttonServer);
            resources.ApplyResources(this.group1, "group1");
            this.group1.Name = "group1";
            // 
            // buttonConnect
            // 
            this.buttonConnect.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonConnect, "buttonConnect");
            this.buttonConnect.Image = global::ExcelAddIn.Properties.Resources.connect;
            this.buttonConnect.Name = "buttonConnect";
            this.buttonConnect.ShowImage = true;
            this.buttonConnect.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonConnect_Click);
            // 
            // buttonServer
            // 
            this.buttonServer.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonServer, "buttonServer");
            this.buttonServer.Image = global::ExcelAddIn.Properties.Resources.server_settings;
            this.buttonServer.Name = "buttonServer";
            this.buttonServer.ShowImage = true;
            this.buttonServer.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonServer_Click);
            // 
            // group2
            // 
            this.group2.Items.Add(this.buttonSettings);
            this.group2.Items.Add(this.buttonRefreshAll);
            resources.ApplyResources(this.group2, "group2");
            this.group2.Name = "group2";
            // 
            // buttonSettings
            // 
            this.buttonSettings.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonSettings, "buttonSettings");
            this.buttonSettings.Image = global::ExcelAddIn.Properties.Resources.settings;
            this.buttonSettings.Name = "buttonSettings";
            this.buttonSettings.ShowImage = true;
            this.buttonSettings.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonSettings_Click);
            // 
            // buttonRefreshAll
            // 
            this.buttonRefreshAll.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonRefreshAll, "buttonRefreshAll");
            this.buttonRefreshAll.Image = global::ExcelAddIn.Properties.Resources.refresh;
            this.buttonRefreshAll.Name = "buttonRefreshAll";
            this.buttonRefreshAll.ShowImage = true;
            this.buttonRefreshAll.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonRefreshAll_Click);
            // 
            // group3
            // 
            this.group3.Items.Add(this.buttonPublish);
            resources.ApplyResources(this.group3, "group3");
            this.group3.Name = "group3";
            // 
            // buttonPublish
            // 
            this.buttonPublish.ControlSize = Microsoft.Office.Core.RibbonControlSize.RibbonControlSizeLarge;
            resources.ApplyResources(this.buttonPublish, "buttonPublish");
            this.buttonPublish.Image = global::ExcelAddIn.Properties.Resources.save;
            this.buttonPublish.Name = "buttonPublish";
            this.buttonPublish.ShowImage = true;
            this.buttonPublish.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.buttonPublish_Click);
            // 
            // groupSageX3
            // 
            this.groupSageX3.Items.Add(this.checkBox1);
            this.groupSageX3.Items.Add(this.dropDownInsert);
            this.groupSageX3.Items.Add(this.dropDownDelete);
            resources.ApplyResources(this.groupSageX3, "groupSageX3");
            this.groupSageX3.Name = "groupSageX3";
            // 
            // checkBox1
            // 
            resources.ApplyResources(this.checkBox1, "checkBox1");
            this.checkBox1.Name = "checkBox1";
            this.checkBox1.Click += new Microsoft.Office.Tools.Ribbon.RibbonControlEventHandler(this.checkBox1_Click);
            // 
            // dropDownInsert
            // 
            resources.ApplyResources(this.dropDownInsert, "dropDownInsert");
            resources.ApplyResources(ribbonDropDownItem1, "ribbonDropDownItem1");
            resources.ApplyResources(ribbonDropDownItem2, "ribbonDropDownItem2");
            resources.ApplyResources(ribbonDropDownItem3, "ribbonDropDownItem3");
            this.dropDownInsert.Items.Add(ribbonDropDownItem1);
            this.dropDownInsert.Items.Add(ribbonDropDownItem2);
            this.dropDownInsert.Items.Add(ribbonDropDownItem3);
            this.dropDownInsert.Name = "dropDownInsert";
            // 
            // dropDownDelete
            // 
            resources.ApplyResources(this.dropDownDelete, "dropDownDelete");
            resources.ApplyResources(ribbonDropDownItem4, "ribbonDropDownItem4");
            resources.ApplyResources(ribbonDropDownItem5, "ribbonDropDownItem5");
            resources.ApplyResources(ribbonDropDownItem6, "ribbonDropDownItem6");
            this.dropDownDelete.Items.Add(ribbonDropDownItem4);
            this.dropDownDelete.Items.Add(ribbonDropDownItem5);
            this.dropDownDelete.Items.Add(ribbonDropDownItem6);
            this.dropDownDelete.Name = "dropDownDelete";
            // 
            // Ribbon
            // 
            this.Name = "Ribbon";
            this.RibbonType = "Microsoft.Excel.Workbook";
            this.Tabs.Add(this.syracuseTab);
            resources.ApplyResources(this, "$this");
            this.Load += new Microsoft.Office.Tools.Ribbon.RibbonUIEventHandler(this.Ribbon_Load);
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
