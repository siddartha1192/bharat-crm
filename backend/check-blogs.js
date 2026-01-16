const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBlogs() {
  try {
    const count = await prisma.blogPost.count();
    console.log(`Total blog posts in database: ${count}`);

    if (count > 0) {
      const published = await prisma.blogPost.count({ where: { status: 'published' } });
      console.log(`Published blog posts: ${published}`);

      const posts = await prisma.blogPost.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          category: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log('\nBlog posts:');
      posts.forEach((post, idx) => {
        console.log(`${idx + 1}. ${post.title}`);
        console.log(`   Status: ${post.status}, Slug: ${post.slug}, Category: ${post.category}`);
        console.log(`   Published: ${post.publishedAt ? new Date(post.publishedAt).toISOString() : 'Not published'}\n`);
      });
    } else {
      console.log('\n⚠️  No blog posts found! Run the seed script:');
      console.log('   node backend/seed-blog-posts.js');
    }
  } catch (error) {
    console.error('Error checking blogs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlogs();
