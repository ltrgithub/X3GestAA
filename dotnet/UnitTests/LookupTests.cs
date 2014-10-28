using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using CommonDataHelper.OwnerHelper;
using CommonDataHelper;
using System.Threading;
using CommonDataHelper.StorageVolumeHelper;
using CommonDataHelper.TagHelper;
using CommonDataHelper.TeamHelper;

namespace UnitTests
{
    [TestFixture]
    public class LookupTests
    {
        [Test, RequiresSTA]
        public void ownerLookupTest()
        {
            Assert.DoesNotThrow(ownerLookup);
        }

        [Test, RequiresSTA]
        public void storageVolumeLookupTest()
        {
            Assert.DoesNotThrow(storageVolumeLookup);
        }

        [Test, RequiresSTA]
        public void tagLookupTest()
        {
            Assert.DoesNotThrow(tagLookup);
        }

        [Test, RequiresSTA]
        public void teamLookupTest()
        {
            Assert.DoesNotThrow(teamLookup);
        }

        public void ownerLookup()
        {
            List<OwnerItem> list = new OwnerList().createOwnerList();
            Assert.AreNotSame(null, list);
            Assert.IsNotEmpty(list);
        }

        public void storageVolumeLookup() 
        {
            List<StorageVolumeItem> list = new StorageVolumeList().createStorageVolumeList();
            Assert.AreNotSame(null, list);
            Assert.IsNotEmpty(list);
        }

        public void tagLookup()
        {
            List<TagItem> list = new TagList().createTagList();
            Assert.AreNotSame(null, list);
            Assert.IsNotEmpty(list);
        }

        public void teamLookup()
        {
            List<TeamItem> list = new TeamList().createTeamList();
            Assert.AreNotSame(null, list);
            Assert.IsNotEmpty(list);
        }
    }
}
