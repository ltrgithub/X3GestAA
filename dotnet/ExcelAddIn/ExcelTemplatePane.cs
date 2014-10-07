using System;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using Microsoft.Office.Interop.Excel;
using System.Text;

namespace ExcelAddIn
{
    public partial class ExcelTemplatePane : UserControl
    {
        public ExcelTemplatePane()
        {
            InitializeComponent();

            this.SizeChanged += new EventHandler(ExcelTemplatePane_SizeChanged);
            this.treeViewFields.NodeMouseDoubleClick += new TreeNodeMouseClickEventHandler(ExcelTemplatePane_NodeMouseDoubleClick);
            this.treeViewFields.ImageList = ReportingFieldUtil.getTypeImageList();
        }

        public void ExcelTemplatePane_SizeChanged(Object sender, EventArgs e)
        {
            treeViewFields.Size = this.Size;
        }

        public void ExcelTemplatePane_NodeMouseDoubleClick(Object sender, TreeNodeMouseClickEventArgs e)
        {
            Workbook workbook = Globals.ThisAddIn.Application.ActiveWorkbook;

            try
            {
                FieldTreeNode n = (FieldTreeNode)e.Node;

                if (n.item.ContainsKey("$bind"))
                {
                    Range rng = (Range)Globals.ThisAddIn.Application.ActiveCell;
                    
                    StringBuilder sb = new StringBuilder("<<");
                    if (n.titleParent != null && n.titleParent.Equals("") == false)
                    {
                        sb.Append(n.titleParent);
                        sb.Append(".");
                    }
                    sb.Append(n.item["$title"].ToString());
                    sb.Append(">>");
                    rng.Value2 = sb.ToString();

                    sb.Clear();
                    if (n.itemParent != null && n.titleParent.Equals("") == false)
                    {
                        sb.Append(n.itemParent);
                        sb.Append(".");
                    }
                    sb.Append(n.item["$bind"].ToString());

                    ReportingUtils.clearPlaceholderName(workbook, sb.ToString(), rng);

                    workbook.Names.Add(sb.ToString(), rng);
                }
            }
            catch (Exception ee)
            {
                MessageBox.Show(ee.Message + ":" + ee.StackTrace);
            }
        }

        public void clear()
        {
            treeViewFields.Nodes.Clear();
        }

        public void showFields(Workbook workbook)
        {
            clear();
            if (workbook == null)
                return;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
                return;
            String layoutData = customData.getLayoutData();
            if (layoutData.Equals(String.Empty))
                return;

            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutData);

            String title = String.Empty;
            String boxParent = String.Empty;

            Object[] boxes = (Object[])layout["layout"];
            foreach (Object o in boxes)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    if (box.ContainsKey("$title"))
                    {
                        title = box["$title"].ToString();
                    }

                    if (box.ContainsKey("$level"))
                    {
                        int level = Convert.ToInt32(box["$level"].ToString());
                        if (level == 1)
                        {
                            boxParent = null;
                        }
                        else if (level == 2)
                        {
                            if (box.ContainsKey("$bind"))
                                boxParent = box["$bind"].ToString();
                        }
                    }

                    FieldTreeNode node;
                    if (box.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)box["$items"];
                        String container = "box";

                        if (box.ContainsKey("$container"))
                        {
                            container = box["$container"].ToString();
                        }

                        node = new FieldTreeNode(title);
                        if (container.Equals("table"))
                        {
                                node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.TABLE);
                        }
                        else
                        {
                            node.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(ReportingFieldTypes.BOX);
                        }
                        
                        node.SelectedImageIndex = node.ImageIndex;

                        foreach (KeyValuePair<String, object> i in items)
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                            if (!ReportingUtils.isSupportedType(item))
                                continue;

                            String hidden = item["$hidden"].ToString();
                            String ctitle = item["$title"].ToString();
                            String type = item["$type"].ToString();
                            String bind = item["$bind"].ToString();
                            
                            ReportingFieldTypes tft = ReportingFieldUtil.getType(type);
                            
                            FieldTreeNode child = new FieldTreeNode(ctitle, item);
                            child.titleParent = boxParent != null ? title : null;
                            child.itemParent = boxParent;

                            child.ImageIndex = ReportingFieldUtil.getTypeImageListIndex(tft);
                            child.SelectedImageIndex = child.ImageIndex;

                            node.Nodes.Add(child);
                        }

                        if (node.Nodes.Count > 0)
                            treeViewFields.Nodes.Add(node);
                    }
                }
                catch (Exception) { }
            }
            treeViewFields.ExpandAll();
        }
    }

    public class FieldTreeNode : TreeNode
    {
        public Dictionary<String, Object> item;
        public String itemParent;
        public String titleParent;

        public FieldTreeNode(String title)
            : base(title)
        {
        }
        public FieldTreeNode(String title, Dictionary<String, Object> item)
            : base(title)
        {
            this.item = item;
        }
    };


}
