using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using CommonDialogs.PublishDocumentDialog;

namespace CommonDialogs.PublishDocumentDialog
{
    public partial class PublishDocumentDialog : Form, IPublishDocumentDialog
    {
        public PublishDocumentDialog()
        {
            InitializeComponent();
        }
      
        public string Description
        {
            get { return textBoxDescription.Text; }
            set { textBoxDescription.Text = value; }
        }

        public string StorageVolume
        {
            get { return comboBoxStorageVolume.Text; }
            set { comboBoxStorageVolume.Text = value; }
        }

        public new string Owner
        {
            get { return comboBoxOwner.Text; }
            set { comboBoxOwner.Text = value; }
        }

        public new string Tag
        {
            get { return comboBoxTag.Text; }
            set { comboBoxTag.Text = value; }
        }

        public string Team
        {
            get { return comboBoxTeam.Text; }
            set { comboBoxTeam.Text = value; }
        }

        public List<string> StorageVolumeList
        {
            get { return null; }
            set { comboBoxStorageVolume.DataSource = new BindingSource( value, null).DataSource; }
        }

        public List<string> OwnerList
        {
            get { return null; }
            set { comboBoxOwner.DataSource = new BindingSource(value, null).DataSource; }
        }

        public List<string> TagList
        {
            get { return null; }
            set { comboBoxTag.DataSource = new BindingSource(value, null).DataSource; }
        }

        public List<string> TeamList
        {
            get { return null; }
            set { comboBoxTeam.DataSource = new BindingSource(value, null).DataSource; }
        }

        private void btnOk_Click(object sender, EventArgs e)
        {
            _publisherDelegate();
        }

        PublisherDelegate _publisherDelegate = null;
        public void Publisher(PublisherDelegate publisherDelegate) 
        {
            _publisherDelegate = publisherDelegate;
        }

        //private ISyracuseOfficeCustomData _syracuseCustomData = null;
        


        //public DialogResult DialogShow()
        //{
        //    return ShowDialog();
        //}
    }
}
