using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace WordAddIn
{
    public partial class ProgressDialog : Form
    {
        int rowsDone = 0;

        public ProgressDialog()
        {
            InitializeComponent();
            this.progressBar.Minimum = 0;
            this.progressBar.Maximum = 1;
        }

        public void SignalRowDone()
        {
            try
            {
                this.rowsDone++;
                progressBar.Value = this.rowsDone;
                progressBar.Refresh();
            } catch (Exception) {}
        }

        public void SetRowsExpected(int rowsToFill)
        {
            try {
                this.progressBar.Maximum = rowsToFill;
                this.rowsDone = 0;
            }
            catch (Exception) { }
        }
    }
}
